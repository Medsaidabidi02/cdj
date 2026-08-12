import express from 'express';
import database from '../config/database';

const router = express.Router();

/**
 * GET /api/public/stats
 * Returns public statistics for the home page.
 * - totalUsers: Total number of users
 * - recentAvatars: Last 4 users who uploaded a profile picture
 */
router.get('/stats', async (req, res) => {
  try {
    console.log('📊 GET /api/public/stats - Fetching home page statistics');

    // 1. Get total user count (only students, same as Inbox tab)
    const countResult = await database.query('SELECT COUNT(*) as total FROM users WHERE is_admin = 0');
    const totalUsers = parseInt(countResult.rows[0]?.total || '0');

    // 2. Get 4 random users with avatars
    // Ordering by RAND() to pick 4 different people on each refresh
    const avatarResult = await database.query(`
      SELECT id, name, profile_picture 
      FROM users 
      WHERE profile_picture IS NOT NULL 
      ORDER BY RAND() 
      LIMIT 4
    `);

    console.log(`✅ Stats fetched: ${totalUsers} total users, ${avatarResult.rows.length} recent avatars`);

    res.json({
      success: true,
      totalUsers,
      recentAvatars: avatarResult.rows
    });
  } catch (error) {
    console.error('❌ Error fetching public stats:', error);
    res.status(500).json({ success: false, message: 'Error fetching statistics' });
  }
});

export { router as publicRoutes };
export default router;
