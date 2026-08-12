/**
 * liveStream.ts  — REST routes for live session management
 *
 * POST /api/live/sessions          – create a new session (teacher only)
 * GET  /api/live/sessions          – list all sessions
 * GET  /api/live/sessions/:id      – get a single session
 * PATCH /api/live/sessions/:id/end – mark a session as ended (teacher/admin)
 */

import { Router, Request, Response } from 'express';
import database from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export const liveStreamRoutes = Router();

// ─── Middleware: require authentication ───────────────────────────────────
import jwt from 'jsonwebtoken';

function requireAuth(req: Request, res: Response, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  try {
    const secret = process.env.JWT_SECRET || 'legal-education-platform-super-secret-key-medsaidabidi02-2025-mysql5-version';
    const decoded = jwt.verify(authHeader.slice(7), secret) as any;
    (req as any).user = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

// ─── POST /api/live/sessions ─────────────────────────────────────────────

liveStreamRoutes.post('/sessions', requireAuth, async (req: Request, res: Response) => {
  try {
    const { title, subject_ids } = req.body;
    const user = (req as any).user;

    if (!title) {
      return res.status(400).json({ success: false, message: 'title is required' });
    }

    const sessionId = uuidv4();

    await database.query(
      `INSERT INTO live_sessions (id, host_id, title, status, created_at, updated_at)
       VALUES (?, ?, ?, 'scheduled', NOW(), NOW())`,
      [sessionId, user.id, title]
    );

    // Link subjects if provided
    if (Array.isArray(subject_ids) && subject_ids.length > 0) {
      const values = subject_ids.map((sid: number) => [sessionId, sid]);
      await database.query(
        `INSERT IGNORE INTO live_session_subjects (session_id, subject_id) VALUES ?`,
        [values]
      );
    }

    res.status(201).json({
      success: true,
      data: { id: sessionId, title, status: 'scheduled', host_id: user.id },
    });
  } catch (error: any) {
    console.error('❌ Create live session error:', error);
    res.status(500).json({ success: false, message: 'Failed to create session' });
  }
});

// ─── GET /api/live/sessions ──────────────────────────────────────────────

liveStreamRoutes.get('/sessions', async (_req: Request, res: Response) => {
  try {
    const result = await database.query(
      `SELECT ls.*, u.name AS host_name
       FROM live_sessions ls
       JOIN users u ON u.id = ls.host_id
       ORDER BY ls.created_at DESC
       LIMIT 50`
    );
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('❌ List live sessions error:', error);
    res.status(500).json({ success: false, message: 'Failed to list sessions' });
  }
});

// ─── GET /api/live/sessions/:id ──────────────────────────────────────────

liveStreamRoutes.get('/sessions/:id', async (req: Request, res: Response) => {
  try {
    const result = await database.query(
      `SELECT ls.*, u.name AS host_name
       FROM live_sessions ls
       JOIN users u ON u.id = ls.host_id
       WHERE ls.id = ?`,
      [req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('❌ Get live session error:', error);
    res.status(500).json({ success: false, message: 'Failed to get session' });
  }
});

// ─── PATCH /api/live/sessions/:id/start ─────────────────────────────────

liveStreamRoutes.patch('/sessions/:id/start', requireAuth, async (req: Request, res: Response) => {
  try {
    await database.query(
      `UPDATE live_sessions SET status = 'live', started_at = NOW(), updated_at = NOW() WHERE id = ?`,
      [req.params.id]
    );
    res.json({ success: true, message: 'Session started' });
  } catch (error: any) {
    console.error('❌ Start live session error:', error);
    res.status(500).json({ success: false, message: 'Failed to start session' });
  }
});

// ─── PATCH /api/live/sessions/:id/end ───────────────────────────────────

liveStreamRoutes.patch('/sessions/:id/end', requireAuth, async (req: Request, res: Response) => {
  try {
    const { recording_path } = req.body;
    await database.query(
      `UPDATE live_sessions
       SET status = 'ended', ended_at = NOW(), updated_at = NOW()
       ${recording_path ? ', recording_path = ?' : ''}
       WHERE id = ?`,
      recording_path ? [recording_path, req.params.id] : [req.params.id]
    );
    res.json({ success: true, message: 'Session ended' });
  } catch (error: any) {
    console.error('❌ End live session error:', error);
    res.status(500).json({ success: false, message: 'Failed to end session' });
  }
});

export default liveStreamRoutes;
