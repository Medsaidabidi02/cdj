import { Router } from 'express';
import database from '../config/database';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { getPublicAssetUrl } from '../services/hetznerService';

const router = Router();

console.log('📚 Courses API loaded - Hetzner thumbnail URLs enabled');

// GET all courses - REAL DATA ONLY
router.get('/', async (req, res) => {
  try {
    console.log('📋 GET /api/courses - Real database database.query');
    
    const result = await database.query(`
      SELECT 
        c.id,
        c.title,
        c.description,
        c.cover_image,
        c.is_active,
        c.created_at,
        c.updated_at,
        c.category,
        c.thumbnail_path,
        COUNT(DISTINCT s.id) as subject_count,
        COUNT(DISTINCT v.id) as video_count,
        COALESCE(SUM(s.hours), 0) as total_hours
      FROM courses c
      LEFT JOIN subjects s ON c.id = s.course_id AND s.is_active = true
      LEFT JOIN videos v ON s.id = v.subject_id AND v.is_active = true
      WHERE c.is_active = true
      GROUP BY c.id, c.title, c.description, c.cover_image, c.is_active, c.created_at, c.updated_at, c.category, c.thumbnail_path
      ORDER BY c.created_at DESC
    `);
    
    // Transform cover_image paths to use Hetzner public URLs
    const courses = result.rows.map(course => {
      let cover_image_url = course.cover_image;
      let thumbnail_url = course.thumbnail_path;
      
      // Transform cover image to Hetzner URL if it exists and looks like a path
      if (cover_image_url && !cover_image_url.startsWith('http')) {
        try {
          cover_image_url = getPublicAssetUrl(cover_image_url);
        } catch (error) {
          console.error(`❌ Error generating cover image URL for course ${course.id}:`, error);
        }
      }
      
      // Transform thumbnail to Hetzner URL if it exists and looks like a path
      if (thumbnail_url && !thumbnail_url.startsWith('http')) {
        try {
          thumbnail_url = getPublicAssetUrl(thumbnail_url);
        } catch (error) {
          console.error(`❌ Error generating thumbnail URL for course ${course.id}:`, error);
        }
      }
      
      return {
        ...course,
        cover_image: cover_image_url,
        thumbnail_path: thumbnail_url
      };
    });
    
    console.log(`✅ Real data: Found ${courses.length} courses`);
    res.json(courses);
    
  } catch (error) {
    console.error('❌ Database error:', error);
    res.status(500).json({ 
      message: 'Database error fetching courses',
      error: error.message 
    });
  }
});

// GET single course - REAL DATA ONLY
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📋 GET /api/courses/${id} - Real database database.query`);
    
    const result = await database.query(`
      SELECT 
        c.id,
        c.title,
        c.description,
        c.cover_image,
        c.is_active,
        c.created_at,
        c.updated_at,
        c.category,
        c.thumbnail_path,
        COUNT(DISTINCT s.id) as subject_count,
        COUNT(DISTINCT v.id) as video_count,
        COALESCE(SUM(s.hours), 0) as total_hours
      FROM courses c
      LEFT JOIN subjects s ON c.id = s.course_id AND s.is_active = true
      LEFT JOIN videos v ON s.id = v.subject_id AND v.is_active = true
      WHERE c.id = ?
      GROUP BY c.id, c.title, c.description, c.cover_image, c.is_active, c.created_at, c.updated_at, c.category, c.thumbnail_path
    `, [id]);
    
    if (result.rows.length === 0) {
      console.log(`❌ Course ${id} not found in database`);
      return res.status(404).json({ message: 'Course not found' });
    }
    
    const course = result.rows[0];
    let cover_image_url = course.cover_image;
    let thumbnail_url = course.thumbnail_path;
    
    // Transform cover image to Hetzner URL if it exists and looks like a path
    if (cover_image_url && !cover_image_url.startsWith('http')) {
      try {
        cover_image_url = getPublicAssetUrl(cover_image_url);
      } catch (error) {
        console.error(`❌ Error generating cover image URL for course ${id}:`, error);
      }
    }
    
    // Transform thumbnail to Hetzner URL if it exists and looks like a path
    if (thumbnail_url && !thumbnail_url.startsWith('http')) {
      try {
        thumbnail_url = getPublicAssetUrl(thumbnail_url);
      } catch (error) {
        console.error(`❌ Error generating thumbnail URL for course ${id}:`, error);
      }
    }
    
    console.log(`✅ Real data: Found course ${id}`);
    res.json({
      ...course,
      cover_image: cover_image_url,
      thumbnail_path: thumbnail_url
    });
    
  } catch (error) {
    console.error(`❌ Database error fetching course ${req.params.id}:`, error);
    res.status(500).json({ 
      message: 'Database error fetching course',
      error: error.message 
    });
  }
});

// POST create new course - REAL DATABASE INSERT
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { title, description, cover_image, category, is_active, thumbnail_path } = req.body;
    
    console.log('➕ POST /api/courses - Creating course');
    console.log('👤 User:', req.user?.name || req.user?.email);
    console.log('📝 Course data:', { title, description, category });
    
    // Validate required fields
    if (!title || title.trim() === '') {
      console.log('❌ Missing or empty title');
      return res.status(400).json({ message: 'Course title is required' });
    }
    
    const result = await database.query(`
      INSERT INTO courses (title, description, cover_image, category, thumbnail_path, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      title.trim(),
      description?.trim() || '',
      cover_image || null,
      category?.trim() || null,
      thumbnail_path || null,
      is_active !== false
    ]);
    
    // Get the created course
    const createdCourseResult = await database.query('SELECT * FROM courses WHERE id = ?', [result.insertId]);
    const course = createdCourseResult.rows[0];
    
    // Transform cover_image and thumbnail_path to Hetzner URLs if they exist and look like paths
    let cover_image_url = course.cover_image;
    let thumbnail_url = course.thumbnail_path;
    
    if (cover_image_url && !cover_image_url.startsWith('http')) {
      try {
        cover_image_url = getPublicAssetUrl(cover_image_url);
      } catch (error) {
        console.error(`❌ Error generating cover image URL for new course ${course.id}:`, error);
      }
    }
    
    if (thumbnail_url && !thumbnail_url.startsWith('http')) {
      try {
        thumbnail_url = getPublicAssetUrl(thumbnail_url);
      } catch (error) {
        console.error(`❌ Error generating thumbnail URL for new course ${course.id}:`, error);
      }
    }
    
    const responseData = {
      ...course,
      cover_image: cover_image_url,
      thumbnail_path: thumbnail_url
    };
    
    console.log('✅ Course created in database:', responseData);
    res.status(201).json(responseData);
    
  } catch (error) {
    console.error('❌ Database error creating course:', error);
    res.status(500).json({ 
      message: 'Database error creating course',
      error: error.message 
    });
  }
});

// PUT update course - REAL DATABASE UPDATE
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, cover_image, category, is_active, thumbnail_path } = req.body;
    
    console.log(`🔄 PUT /api/courses/${id} - Updating course`);
    console.log('👤 User:', req.user?.name || req.user?.email);
    console.log('📝 Update data:', { title, description, category, is_active });
    
    // Check if course exists first
    const existsResult = await database.query('SELECT id FROM courses WHERE id = ?', [id]);
    if (existsResult.rows.length === 0) {
      console.log(`❌ Course ${id} not found for update`);
      return res.status(404).json({ message: 'Course not found' });
    }
    
    await database.query(`
      UPDATE courses
      SET title = COALESCE(?, title),
          description = COALESCE(?, description),
          cover_image = COALESCE(?, cover_image),
          category = COALESCE(?, category),
          thumbnail_path = COALESCE(?, thumbnail_path),
          is_active = COALESCE(?, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      title?.trim() || null,
      description?.trim() || null,
      cover_image || null,
      category?.trim() || null,
      thumbnail_path || null,
      is_active,
      id
    ]);
    
    // Get the updated course
    const updatedCourseResult = await database.query('SELECT * FROM courses WHERE id = ?', [id]);
    const course = updatedCourseResult.rows[0];
    
    // Transform cover_image and thumbnail_path to Hetzner URLs if they exist and look like paths
    let cover_image_url = course.cover_image;
    let thumbnail_url = course.thumbnail_path;
    
    if (cover_image_url && !cover_image_url.startsWith('http')) {
      try {
        cover_image_url = getPublicAssetUrl(cover_image_url);
      } catch (error) {
        console.error(`❌ Error generating cover image URL for course ${id}:`, error);
      }
    }
    
    if (thumbnail_url && !thumbnail_url.startsWith('http')) {
      try {
        thumbnail_url = getPublicAssetUrl(thumbnail_url);
      } catch (error) {
        console.error(`❌ Error generating thumbnail URL for course ${id}:`, error);
      }
    }
    
    const responseData = {
      ...course,
      cover_image: cover_image_url,
      thumbnail_path: thumbnail_url
    };
    
    console.log(`✅ Course ${id} updated in database`);
    res.json(responseData);
    
  } catch (error) {
    console.error(`❌ Database error updating course ${req.params.id}:`, error);
    res.status(500).json({ 
      message: 'Database error updating course',
      error: error.message 
    });
  }
});

// DELETE course - REAL DATABASE DELETE WITH CASCADE
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ DELETE /api/courses/${id} - Real database deletion`);
    console.log('👤 User:', req.user?.name || req.user?.email);
    
    // Check if course exists and get its info
    const courseCheck = await database.query('SELECT id, title FROM courses WHERE id = ?', [id]);
    if (courseCheck.rows.length === 0) {
      console.log(`❌ Course ${id} not found for deletion by Azizkh07`);
      return res.status(404).json({ message: 'Course not found' });
    }
    
    const courseName = courseCheck.rows[0].title;
    console.log(`🎯 Deleting real course: "${courseName}" (ID: ${id})`);
    
    try {
      // Delete related videos first (they reference subjects)
      console.log('🔄 Step 1: Deleting related videos from database...');
      const videosResult = await database.query(`
        DELETE FROM videos 
        WHERE subject_id IN (
          SELECT id FROM subjects WHERE course_id = ?
        )
      `, [id]);
      console.log(`✅ Deleted related videos from database`);
      
      // Delete related subjects
      console.log('🔄 Step 2: Deleting related subjects from database...');
      const subjectsResult = await database.query('DELETE FROM subjects WHERE course_id = ?', [id]);
      console.log(`✅ Deleted related subjects from database`);
      
      // Delete user_courses relations
      console.log('🔄 Step 3: Deleting user course assignments from database...');
      const userCoursesResult = await database.query('DELETE FROM user_courses WHERE course_id = ?', [id]);
      console.log(`✅ Deleted user course assignments from database`);
      
      // Finally delete the course
      console.log('🔄 Step 4: Deleting course from database...');
      const courseResult = await database.query('DELETE FROM courses WHERE id = ?', [id]);
      
      console.log(`✅ Course "${courseName}" (ID: ${id}) completely deleted from database`);
      res.json({ 
        message: 'Course and all related data deleted successfully from database',
        deletedCourse: { id, title: courseName }
      });
      
    } catch (deleteError) {
      throw deleteError;
    }
    
  } catch (error) {
    console.error(`❌ Database error deleting course ${req.params.id}:`, error);
    res.status(500).json({ 
      message: 'Database error deleting course',
      error: error.message 
    });
  }
});

// Get course with subjects - REAL DATA ONLY
router.get('/:id/subjects', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📋 GET /api/courses/${id}/subjects - Real data`);
    
    const courseResult = await database.query('SELECT * FROM courses WHERE id = ?', [id]);
    if (courseResult.rows.length === 0) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    const subjectsResult = await database.query(`
      SELECT 
        s.*,
        COUNT(v.id) as video_count
      FROM subjects s
      LEFT JOIN videos v ON s.id = v.subject_id AND v.is_active = true
      WHERE s.course_id = ? AND s.is_active = true
      GROUP BY s.id
      ORDER BY s.order_index, s.created_at
    `, [id]);
    
    console.log(`✅ Real data: Course ${id} has ${subjectsResult.rows.length} subjects`);
    res.json({
      course: courseResult.rows[0],
      subjects: subjectsResult.rows
    });
    
  } catch (error) {
    console.error(`❌ Database error fetching course subjects:`, error);
    res.status(500).json({ 
      message: 'Database error fetching course subjects',
      error: error.message 
    });
  }
});


export default router;
export { router as coursesRoutes };