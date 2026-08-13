import app from './app';
import { config } from './config';
import database from './config/database';
import { createServer } from 'http';
import { Server } from 'socket.io';
import notificationService from './services/notificationService';
import jwt from 'jsonwebtoken';

// ─── Step 3: Mediasoup + Live Stream Services ──────────────────────────────
import {
  initMediasoup,
  getRouterRtpCapabilities,
  createWebRtcTransport,
  connectTransport,
  produce,
  consume,
  getActiveProducers,
  cleanupSocket,
} from './services/mediasoupService';

import {
  startRecording,
  appendChunk,
  finaliseRecording,
  abortRecording,
} from './services/liveStreamService';

// Track which session each teacher socket is recording
const socketSessions = new Map<string, string>(); // socketId → sessionId

const startServer = async () => {
  try {
    // Test database connection using the helper function
    const testResult = await database.query('SELECT NOW() as now');
    console.log(`✅ Database test query successful for Medsaidabidi02: ${JSON.stringify(testResult.rows)}`);
    console.log('✅ Database connected successfully');

    // ✅ SIMPLE ONE-SESSION-PER-USER: Reset all is_logged_in flags on server restart
    try {
      const resetResult = await database.query(
        'UPDATE users SET is_logged_in = FALSE, current_session_id = NULL WHERE is_logged_in = TRUE'
      );
      if (resetResult.affectedRows > 0) {
        console.log(`✅ Reset is_logged_in and session IDs for ${resetResult.affectedRows} user(s) on server restart`);
      }
    } catch (resetError: any) {
      console.warn('⚠️ Could not reset session tracking (columns may not exist):', resetError.code || resetError.message);
      try {
        const basicResetResult = await database.query(
          'UPDATE users SET is_logged_in = FALSE WHERE is_logged_in = TRUE'
        );
        if (basicResetResult.affectedRows > 0) {
          console.log(`✅ Reset is_logged_in for ${basicResetResult.affectedRows} user(s) (basic mode)`);
        }
      } catch (basicError: any) {
        console.warn('⚠️ Could not reset is_logged_in flags:', basicError.code || basicError.message);
      }
      console.warn('⚠️ Run migration: add_is_logged_in_column.sql');
    }

    // Check if admin exists
    const adminCheck = await database.query(
      'SELECT email, is_admin, is_approved FROM users WHERE is_admin = true'
    );
    
    console.log('👑 Admin users found:', adminCheck.rows.length);
    if (adminCheck.rows.length > 0) {
      console.log('👑 Admin details:', adminCheck.rows.map((u: any) => ({
        email: u.email,
        is_admin: u.is_admin,
        is_approved: u.is_approved
      })));
    }

    // ── Auto-apply live streaming migration (MySQL 5.x compatible) ───────────
    try {
      // 1. is_teacher column — MySQL 5.x doesn't support ADD COLUMN IF NOT EXISTS
      //    so we check information_schema first
      const colCheck = await database.query(
        `SELECT COUNT(*) AS cnt
           FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME   = 'users'
            AND COLUMN_NAME  = 'is_teacher'`
      );
      const colExists = Number(colCheck.rows[0]?.cnt ?? 0) > 0;
      if (!colExists) {
        await database.query(
          `ALTER TABLE users ADD COLUMN is_teacher TINYINT(1) NOT NULL DEFAULT 0`
        );
        console.log('✅ Added is_teacher column to users table');
      } else {
        console.log('✅ is_teacher column already exists');
      }

      // 2. live_sessions table (CREATE IF NOT EXISTS is supported in MySQL 5.x)
      await database.query(`
        CREATE TABLE IF NOT EXISTS live_sessions (
          id             VARCHAR(36)  NOT NULL PRIMARY KEY,
          host_id        INT          NOT NULL,
          title          VARCHAR(255) NOT NULL,
          status         ENUM('scheduled','live','ended') NOT NULL DEFAULT 'scheduled',
          started_at     DATETIME     NULL,
          ended_at       DATETIME     NULL,
          recording_path VARCHAR(500) NULL,
          created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_ls_host FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // 3. live_session_subjects table
      await database.query(`
        CREATE TABLE IF NOT EXISTS live_session_subjects (
          id         INT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
          session_id VARCHAR(36) NOT NULL,
          subject_id INT         NOT NULL,
          CONSTRAINT fk_lss_session FOREIGN KEY (session_id) REFERENCES live_sessions(id) ON DELETE CASCADE,
          UNIQUE KEY uq_session_subject (session_id, subject_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      console.log('✅ Live streaming schema ready');
    } catch (migErr: any) {
      console.warn('⚠️ Live streaming migration warning:', migErr.message);
    }


    // ── Step 3: Initialise Mediasoup ────────────────────────────────────────
    try {
      await initMediasoup();
    } catch (msErr: any) {
      console.warn('⚠️ Mediasoup failed to initialise (is it installed?):', msErr.message);
      console.warn('   Run: cd backend && npm install mediasoup');
    }
    
    // Only start server if this file is run directly (not through Passenger)
    if (require.main === module) {
      const httpServer = createServer(app);
      const io = new Server(httpServer, {
        cors: {
          origin: process.env.NODE_ENV === 'production' 
            ? ['https://cliniquedesjuristes.com', 'https://www.cliniquedesjuristes.com']
            : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3005', 'http://localhost:5000', 'http://localhost:5001', 'http://localhost:5005'],
          methods: ['GET', 'POST'],
          credentials: true
        }
      });

      // Socket.io Authentication Middleware
      io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('Authentication error'));

        try {
          const secret = process.env.JWT_SECRET || 'legal-education-platform-super-secret-key-medsaidabidi02-2025-mysql5-version';
          const decoded = jwt.verify(token, secret) as any;
          (socket as any).userId = decoded.id;
          next();
        } catch (err) {
          next(new Error('Authentication error'));
        }
      });

      io.on('connection', (socket) => {
        const userId = (socket as any).userId;
        if (userId) {
          socket.join(`user_${userId}`);
          console.log(`🔌 User ${userId} connected to socket`);
        }

        // ── Notification room (existing) ─────────────────────────────────────
        socket.on('disconnect', () => {
          console.log(`🔌 User ${userId} disconnected`);

          // ── Step 3: Mediasoup cleanup ─────────────────────────────────────
          cleanupSocket(socket.id);

          // ── Step 5: Abort any in-progress recording ───────────────────────
          const sessionId = socketSessions.get(socket.id);
          if (sessionId) {
            abortRecording(sessionId);
            socketSessions.delete(socket.id);
          }
        });

        // ════════════════════════════════════════════════════════════════════
        // Step 3: Mediasoup Signaling Events
        // ════════════════════════════════════════════════════════════════════

        /**
         * 1. Client asks for Router RTP capabilities
         *    (needed to initialise mediasoup-client Device on the browser)
         */
        socket.on('getRouterRtpCapabilities', (callback: (caps: any) => void) => {
          try {
            callback(getRouterRtpCapabilities());
          } catch (err: any) {
            console.error('getRouterRtpCapabilities error:', err.message);
            callback({ error: err.message });
          }
        });

        /**
         * 2. Client requests a WebRTC transport (used for both send + receive).
         *    Returns ICE/DTLS parameters the browser needs to connect.
         */
        socket.on('createWebRtcTransport', async (callback: (info: any) => void) => {
          try {
            const info = await createWebRtcTransport(socket.id);
            callback(info);
          } catch (err: any) {
            console.error('createWebRtcTransport error:', err.message);
            callback({ error: err.message });
          }
        });

        /**
         * 3. Client connects its transport (DTLS handshake)
         */
        socket.on('connectTransport', async (
          { transportId, dtlsParameters }: { transportId: string; dtlsParameters: any },
          callback: (result: any) => void,
        ) => {
          try {
            await connectTransport(transportId, dtlsParameters);
            callback({ connected: true });
          } catch (err: any) {
            console.error('connectTransport error:', err.message);
            callback({ error: err.message });
          }
        });


        /**
         * 4. Teacher (or student speaking) starts sending media
         */
        socket.on('produce', async (
          { transportId, kind, rtpParameters }: { transportId: string; kind: 'audio' | 'video'; rtpParameters: object },
          callback: (result: any) => void,
        ) => {
          try {
            const info = await produce(socket.id, transportId, kind, rtpParameters);
            callback({ id: info.id });

            // Notify all OTHER sockets that a new producer is available
            socket.broadcast.emit('newProducer', { producerId: info.id, kind: info.kind });
          } catch (err: any) {
            console.error('produce error:', err.message);
            callback({ error: err.message });
          }
        });

        /**
         * 5. Student wants to consume (receive) a producer's media
         */
        socket.on('consume', async (
          {
            transportId,
            producerId,
            rtpCapabilities,
          }: { transportId: string; producerId: string; rtpCapabilities: object },
          callback: (result: any) => void,
        ) => {
          try {
            const info = await consume(socket.id, transportId, producerId, rtpCapabilities);
            callback(info);
          } catch (err: any) {
            console.error('consume error:', err.message);
            callback({ error: err.message });
          }
        });

        /**
         * 6. New student joining – send them the list of existing producers
         */
        socket.on('getActiveProducers', (callback: (producers: any[]) => void) => {
          callback(getActiveProducers());
        });

        // ════════════════════════════════════════════════════════════════════
        // Step 5: Browser-Side Recording Events
        // ════════════════════════════════════════════════════════════════════

        /**
         * Teacher starts a live session and recording.
         * Payload: { sessionId: string }
         */
        socket.on('start-stream', ({ sessionId }: { sessionId: string }) => {
          try {
            startRecording(sessionId);
            socketSessions.set(socket.id, sessionId);
            // Broadcast to students that stream is live
            socket.broadcast.emit('stream-started', { sessionId });
            console.log(`🔴 Stream started for session ${sessionId} by socket ${socket.id}`);
          } catch (err: any) {
            console.error('start-stream error:', err.message);
          }
        });

        /**
         * Teacher sends a 5-second binary chunk from MediaRecorder.
         * Payload: ArrayBuffer / Buffer
         */
        socket.on('recording-chunk', (chunk: Buffer) => {
          const sessionId = socketSessions.get(socket.id);
          if (sessionId) {
            appendChunk(sessionId, Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
        });

        /**
         * Teacher ends the stream.
         * Triggers: finalise recording → FFmpeg → Hetzner upload → DB update
         */
        socket.on('end-stream', async () => {
          const sessionId = socketSessions.get(socket.id);
          if (!sessionId) return;

          console.log(`🛑 Stream ended for session ${sessionId}`);
          socket.broadcast.emit('stream-ended', { sessionId });

          socketSessions.delete(socket.id);

          try {
            const recordingUrl = await finaliseRecording(sessionId);
            if (recordingUrl) {
              console.log(`🎬 Recording available at: ${recordingUrl}`);
              // Update the DB with the recording URL
              await database.query(
                `UPDATE live_sessions SET status = 'ended', ended_at = NOW(), recording_path = ?, updated_at = NOW() WHERE id = ?`,
                [recordingUrl, sessionId]
              );
              // Notify teacher that upload is done
              socket.emit('recording-ready', { sessionId, url: recordingUrl });
            }
          } catch (err: any) {
            console.error('finaliseRecording error:', err.message);
          }
        });
      });

      // Provide io instance to notification service
      notificationService.setIo(io);

      httpServer.listen(config.port, () => {
        console.log(`🚀 Server with Socket.io running on port ${config.port}`);
        console.log(`🌍 Environment: ${config.nodeEnv}`);
        console.log(`📡 API URL: ${config.apiUrl}`);
      });
    }
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.log('Holding process open for 5 minutes so logs can be read in Coolify...');
    setInterval(() => console.log('Waiting for log inspection...'), 10000);
  }
};

// Initialize the server
startServer();
