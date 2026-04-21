import { Router } from 'express';
import database from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { getPublicAssetUrl, getPublicVideoUrl, isValidVideoPath } from '../services/hetznerService';

interface VideoProgressRow {
  video_id: number;
  playback_position: string;
  video_duration: string;
  resolution: string | null;
  completed: number;
  last_watched_at: string;
  video_title: string;
  video_description: string;
  thumbnail_path: string | null;
  video_path: string;
  is_active: boolean;
  subject_id: number | null;
  subject_title: string | null;
  professor_name: string | null;
  course_id: number | null;
  course_title: string | null;
  cover_image: string | null;
}

const router = Router();

console.log('📊 Video Progress API loaded');

/**
 * POST /api/video-progress
 * Save or update video progress for a user
 * Body: { videoId, currentTime, duration, resolution?, completed? }
 */
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { videoId, currentTime, duration, resolution, completed } = req.body;

    if (!videoId || currentTime === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'videoId and currentTime are required' 
      });
    }

    // Check if video exists
    const videoCheck = await database.query('SELECT id FROM videos WHERE id = ?', [videoId]);
    if (videoCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    // Upsert progress
    await database.query(`
      INSERT INTO user_video_progress 
        (user_id, video_id, playback_position, video_duration, resolution, completed, last_watched_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        playback_position = VALUES(playback_position),
        video_duration = VALUES(video_duration),
        resolution = COALESCE(VALUES(resolution), resolution),
        completed = VALUES(completed),
        last_watched_at = NOW()
    `, [
      userId, 
      videoId, 
      currentTime, 
      duration || 0, 
      resolution || null, 
      completed ? 1 : 0
    ]);

    res.json({ 
      success: true, 
      message: 'Progress saved',
      data: {
        videoId,
        currentTime,
        duration,
        resolution,
        completed: !!completed
      }
    });

  } catch (error) {
    console.error('❌ Error saving video progress:', error);
    res.status(500).json({ success: false, message: 'Error saving progress' });
  }
});

/**
 * GET /api/video-progress/:videoId
 * Get progress for a specific video
 */
router.get('/:videoId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { videoId } = req.params;

    const result = await database.query(`
      SELECT playback_position, video_duration, resolution, completed, last_watched_at
      FROM user_video_progress
      WHERE user_id = ? AND video_id = ?
    `, [userId, videoId]);

    if (result.rows.length === 0) {
      return res.json({ 
        success: true, 
        data: null,
        message: 'No progress found'
      });
    }

    const progress = result.rows[0];
    res.json({ 
      success: true, 
      data: {
        currentTime: parseFloat(progress.playback_position),
        duration: parseFloat(progress.video_duration),
        resolution: progress.resolution,
        completed: !!progress.completed,
        lastWatchedAt: progress.last_watched_at
      }
    });

  } catch (error) {
    console.error('❌ Error fetching video progress:', error);
    res.status(500).json({ success: false, message: 'Error fetching progress' });
  }
});

/**
 * GET /api/video-progress/continue-watching
 * Get all videos with progress for "Continue Watching" section
 * Returns partially watched videos ordered by last watched timestamp
 * Filters out videos with less than 2 minutes (120 seconds) remaining
 */
router.get('/continue-watching/list', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const limit = parseInt(req.query.limit as string) || 10;

    const result = await database.query(`
      SELECT 
        uvp.video_id,
        uvp.playback_position,
        uvp.video_duration,
        uvp.resolution,
        uvp.completed,
        uvp.last_watched_at,
        v.title as video_title,
        v.description as video_description,
        v.thumbnail_path,
        v.video_path,
        v.is_active,
        s.id as subject_id,
        s.title as subject_title,
        s.professor_name,
        c.id as course_id,
        c.title as course_title,
        c.cover_image
      FROM user_video_progress uvp
      JOIN videos v ON uvp.video_id = v.id
      LEFT JOIN subjects s ON v.subject_id = s.id
      LEFT JOIN courses c ON s.course_id = c.id
      WHERE uvp.user_id = ? 
        AND uvp.completed = 0
        AND uvp.playback_position > 5
        AND (uvp.video_duration - uvp.playback_position) >= 120
        AND v.is_active = true
      ORDER BY uvp.last_watched_at DESC
      LIMIT ?
    `, [userId, limit]);
    
    const videos = result.rows.map((row: VideoProgressRow) => {
      let thumbnailUrl = null;
      let hlsUrl = null;
      
      if (row.thumbnail_path) {
        try {
          thumbnailUrl = getPublicAssetUrl(row.thumbnail_path);
        } catch (e) {
          console.error('Error generating thumbnail URL:', e);
        }
      }
      
      if (row.video_path && isValidVideoPath(row.video_path)) {
        try {
          hlsUrl = getPublicVideoUrl(row.video_path);
        } catch (e) {
          console.error('Error generating HLS URL:', e);
        }
      }
      
      return {
        videoId: row.video_id,
        currentTime: parseFloat(row.playback_position),
        duration: parseFloat(row.video_duration),
        resolution: row.resolution,
        completed: !!row.completed,
        lastWatchedAt: row.last_watched_at,
        video: {
          id: row.video_id,
          title: row.video_title,
          description: row.video_description,
          thumbnail_url: thumbnailUrl,
          thumbnail_path: row.thumbnail_path,
          hls_url: hlsUrl,
          playback_url: hlsUrl,
          video_path: row.video_path,
          is_active: row.is_active,
          subject_id: row.subject_id,
          subject_title: row.subject_title,
          professor_name: row.professor_name,
          course_id: row.course_id,
          course_title: row.course_title,
          cover_image: row.cover_image
        }
      };
    });

    res.json({ 
      success: true, 
      data: videos,
      count: videos.length
    });

  } catch (error) {
    console.error('❌ Error fetching continue watching list:', error);
    res.status(500).json({ success: false, message: 'Error fetching continue watching list' });
  }
});

/**
 * DELETE /api/video-progress/:videoId
 * Delete progress for a specific video
 */
router.delete('/:videoId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { videoId } = req.params;

    await database.query(
      'DELETE FROM user_video_progress WHERE user_id = ? AND video_id = ?',
      [userId, videoId]
    );

    res.json({ success: true, message: 'Progress deleted' });

  } catch (error) {
    console.error('❌ Error deleting video progress:', error);
    res.status(500).json({ success: false, message: 'Error deleting progress' });
  }
});

export { router as videoProgressRoutes };
export default router;

console.log('📊 Video Progress routes module loaded');
