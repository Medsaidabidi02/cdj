import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import database from '../config/database';

const router = express.Router();

// GET /api/notifications - Get current user notifications
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const result = await database.query(`
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 50
    `, [userId]);

    res.json({ success: true, notifications: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
});

// GET /api/notifications/unread-count - Get unread count
router.get('/unread-count', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const result = await database.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );
    res.json({ success: true, count: result.rows[0].count });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed' });
  }
});

// PUT /api/notifications/:id/read - Mark single as read
router.put('/:id/read', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    await database.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed' });
  }
});

// PUT /api/notifications/read-all - Mark all as read
router.put('/read-all', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    await database.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
      [userId]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed' });
  }
});

// POST /api/notifications/subscribe - Save push subscription
router.post('/subscribe', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const { subscription, userAgent } = req.body;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ success: false, error: 'Invalid subscription' });
    }

    // Individual keys extractions
    const endpoint = subscription.endpoint;
    const p256dh = subscription.keys.p256dh;
    const auth_key = subscription.keys.auth;

    await database.query(`
      INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth_key, user_agent)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        user_id = VALUES(user_id),
        p256dh = VALUES(p256dh),
        auth_key = VALUES(auth_key),
        user_agent = VALUES(user_agent)
    `, [userId, endpoint, p256dh, auth_key, userAgent || null]);

    res.json({ success: true, message: 'Subscribed to push notifications' });
  } catch (error) {
    console.error('❌ Subscription error:', error);
    res.status(500).json({ success: false, error: 'Failed to subscribe' });
  }
});

export { router as notificationRoutes };
export default router;
