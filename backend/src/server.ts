import app from './app';
import { config } from './config';
import database from './config/database';
import { createServer } from 'http';
import { Server } from 'socket.io';
import notificationService from './services/notificationService';
import jwt from 'jsonwebtoken';

const startServer = async () => {
  try {
    // Test database connection using the helper function
    const testResult = await database.query('SELECT NOW() as now');
    console.log(`✅ Database test query successful for Medsaidabidi02: ${JSON.stringify(testResult.rows)}`);
    console.log('✅ Database connected successfully');

    // ✅ SIMPLE ONE-SESSION-PER-USER: Reset all is_logged_in flags on server restart
    // This ensures clean state and handles users who closed browser without logging out
    try {
      const resetResult = await database.query(
        'UPDATE users SET is_logged_in = FALSE, current_session_id = NULL WHERE is_logged_in = TRUE'
      );
      if (resetResult.affectedRows > 0) {
        console.log(`✅ Reset is_logged_in and session IDs for ${resetResult.affectedRows} user(s) on server restart`);
      }
    } catch (resetError: any) {
      // Gracefully handle if columns don't exist yet - try basic approach
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
    
    // Only start server if this file is run directly (not through Passenger)
    if (require.main === module) {
      const httpServer = createServer(app);
      const io = new Server(httpServer, {
        cors: {
          origin: process.env.NODE_ENV === 'production' 
            ? ['https://cliniquedesjuristes.com', 'https://www.cliniquedesjuristes.com']
            : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5000', 'http://localhost:5001'],
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

        socket.on('disconnect', () => {
          console.log(`🔌 User ${userId} disconnected`);
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
    if (require.main === module) {
      process.exit(1);
    }
    throw error; // Re-throw for Passenger
  }
};

// Initialize the server
startServer();

