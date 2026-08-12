import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { AuthRequest, authenticateToken, requireAdmin } from '../middleware/auth';
import database from '../config/database';
import notificationService from '../services/notificationService';

const router = express.Router();

console.log('📬 Inbox API loaded - Private PDF streaming enabled');

// Private directory for inbox PDFs (NOT publicly accessible)
const PRIVATE_INBOX_DIR = path.join(__dirname, '../../private/inbox');

// Create private directory if it doesn't exist
try {
  if (!fs.existsSync(PRIVATE_INBOX_DIR)) {
    fs.mkdirSync(PRIVATE_INBOX_DIR, { recursive: true });
    console.log('📁 Created private inbox directory:', PRIVATE_INBOX_DIR);
  } else {
    console.log('📁 Private inbox directory exists:', PRIVATE_INBOX_DIR);
  }
} catch (error) {
  console.error('❌ Error creating private inbox directory:', error);
}

// Configure multer for PDF uploads to private directory
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(PRIVATE_INBOX_DIR)) {
      fs.mkdirSync(PRIVATE_INBOX_DIR, { recursive: true });
    }
    cb(null, PRIVATE_INBOX_DIR);
  },
  filename: (req, file, cb) => {
    // Use cryptographically secure random ID for filename
    const uniqueId = crypto.randomBytes(16).toString('hex');
    cb(null, 'inbox-' + uniqueId + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit for PDFs
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'));
    }
  }
});

// ============================================================================
// ADMIN ENDPOINTS
// ============================================================================

// POST /api/inbox/send - Admin sends inbox message with optional PDF (Admin only)
// Supports: recipient_ids (array of user IDs) and/or course_ids (array of course IDs for enrolled users)
router.post('/send', authenticateToken, requireAdmin, upload.single('pdf'), async (req: AuthRequest, res) => {
  try {
    console.log('📬 POST /api/inbox/send - Admin sending inbox message');
    
    const { recipient_ids, course_ids, title, description } = req.body;
    const sender_id = req.user?.id;

    // Parse recipient_ids and course_ids (they come as JSON strings from FormData)
    let parsedRecipientIds: number[] = [];
    let parsedCourseIds: number[] = [];

    try {
      if (recipient_ids) {
        parsedRecipientIds = JSON.parse(recipient_ids);
        if (!Array.isArray(parsedRecipientIds)) parsedRecipientIds = [];
      }
    } catch { parsedRecipientIds = []; }

    try {
      if (course_ids) {
        parsedCourseIds = JSON.parse(course_ids);
        if (!Array.isArray(parsedCourseIds)) parsedCourseIds = [];
      }
    } catch { parsedCourseIds = []; }

    // Validate that at least one recipient or course is selected
    if (parsedRecipientIds.length === 0 && parsedCourseIds.length === 0) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ 
        success: false, 
        error: 'At least one recipient or course is required' 
      });
    }

    // Validate title
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ 
        success: false, 
        error: 'Title is required' 
      });
    }

    // Limit title length
    const sanitizedTitle = title.trim().substring(0, 255);

    // PDF is now optional - only store filename if file was uploaded
    const pdf_path = req.file ? req.file.filename : null;

    // Collect all recipient IDs
    const allRecipientIds = new Set<number>();

    // Add individual recipients
    for (const id of parsedRecipientIds) {
      const numId = parseInt(String(id), 10);
      if (!isNaN(numId) && numId > 0) {
        allRecipientIds.add(numId);
      }
    }

    // Get enrolled users from selected courses
    if (parsedCourseIds.length > 0) {
      const placeholders = parsedCourseIds.map(() => '?').join(',');
      const enrolledUsers = await database.query(`
        SELECT DISTINCT uc.user_id 
        FROM user_courses uc 
        WHERE uc.course_id IN (${placeholders})
      `, parsedCourseIds);

      for (const row of enrolledUsers.rows) {
        allRecipientIds.add(row.user_id);
      }
    }

    // Remove admin users from recipients (they shouldn't receive inbox messages)
    const adminCheck = await database.query('SELECT id FROM users WHERE is_admin = TRUE');
    const adminIds = new Set(adminCheck.rows.map((r: any) => r.id));
    const finalRecipientIds = Array.from(allRecipientIds).filter(id => !adminIds.has(id));

    if (finalRecipientIds.length === 0) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ 
        success: false, 
        error: 'No valid recipients found' 
      });
    }

    // Description is now the main content of the message - allow up to 10000 characters
    const sanitizedDescription = description ? String(description).substring(0, 10000) : null;

    // Insert inbox message for each recipient
    let successCount = 0;
    for (const recipientId of finalRecipientIds) {
      try {
        await database.query(`
          INSERT INTO inbox_messages (sender_id, recipient_id, title, description, pdf_path, created_at)
          VALUES (?, ?, ?, ?, ?, NOW())
        `, [sender_id, recipientId, sanitizedTitle, sanitizedDescription, pdf_path]);
        
        // Push notification
        notificationService.notifyUser(recipientId, {
          title: 'Nouveau message reçu',
          message: sanitizedTitle,
          type: 'inbox',
          rel_id: recipientId // Using recipientId as rel_id for now as index is per user
        });
        
        successCount++;
      } catch (err) {
        console.error(`Failed to send to recipient ${recipientId}:`, err);
      }
    }

    console.log(`✅ Inbox message sent to ${successCount} recipients`);

    res.status(201).json({
      success: true,
      message: `Message sent to ${successCount} recipient(s)`,
      data: {
        recipients_count: successCount,
        title: sanitizedTitle,
        description: sanitizedDescription,
        created_at: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ Error sending inbox message:', error);
    // Remove uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ 
      success: false, 
      error: 'Error sending inbox message'
    });
  }
});

// GET /api/inbox/admin/courses - Get all courses for admin dropdown
router.get('/admin/courses', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const result = await database.query(`
      SELECT c.id, c.title, 
        (SELECT COUNT(DISTINCT uc.user_id) FROM user_courses uc WHERE uc.course_id = c.id) as enrolled_count
      FROM courses c 
      WHERE c.is_active = TRUE 
      ORDER BY c.title
    `);

    res.json({
      success: true,
      courses: result.rows
    });
  } catch (error: any) {
    console.error('❌ Error fetching courses:', error);
    res.status(500).json({ success: false, error: 'Error fetching courses' });
  }
});

// GET /api/inbox/admin/all - Admin gets all inbox messages (Admin only)
router.get('/admin/all', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    console.log('📬 GET /api/inbox/admin/all - Fetching all inbox messages');

    const result = await database.query(`
      SELECT 
        im.*,
        sender.name as sender_name,
        sender.email as sender_email,
        recipient.name as recipient_name,
        recipient.email as recipient_email
      FROM inbox_messages im
      LEFT JOIN users sender ON im.sender_id = sender.id
      LEFT JOIN users recipient ON im.recipient_id = recipient.id
      ORDER BY im.created_at DESC
    `);

    console.log(`✅ Found ${result.rows.length} inbox messages`);

    res.json({
      success: true,
      messages: result.rows,
      data: result.rows
    });

  } catch (error: any) {
    console.error('❌ Error fetching all inbox messages:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error fetching inbox messages' 
    });
  }
});

// DELETE /api/inbox/admin/:id - Admin deletes inbox message (Admin only)
router.delete('/admin/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    console.log(`📬 DELETE /api/inbox/admin/${id} - Deleting inbox message`);

    // Get PDF path before deletion
    const messageResult = await database.query(
      'SELECT pdf_path FROM inbox_messages WHERE id = ?',
      [id]
    );

    if (messageResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Inbox message not found' 
      });
    }

    const pdfPath = messageResult.rows[0].pdf_path;

    // Delete from database
    await database.query('DELETE FROM inbox_messages WHERE id = ?', [id]);

    // Delete PDF file
    if (pdfPath) {
      const fullPath = path.join(PRIVATE_INBOX_DIR, pdfPath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log('✅ PDF file deleted:', pdfPath);
      }
    }

    console.log(`✅ Inbox message ${id} deleted`);

    res.json({
      success: true,
      message: 'Inbox message deleted successfully'
    });

  } catch (error: any) {
    console.error('❌ Error deleting inbox message:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error deleting inbox message' 
    });
  }
});

// ============================================================================
// STUDENT/USER ENDPOINTS
// ============================================================================

// GET /api/inbox - Get current user's inbox messages
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    console.log(`📬 GET /api/inbox - Fetching inbox for user ${userId}`);

    const result = await database.query(`
      SELECT 
        im.id,
        im.title,
        im.description,
        im.is_read,
        im.created_at,
        im.pdf_path,
        CASE WHEN im.pdf_path IS NOT NULL AND im.pdf_path != '' THEN TRUE ELSE FALSE END as has_pdf,
        sender.name as sender_name
      FROM inbox_messages im
      LEFT JOIN users sender ON im.sender_id = sender.id
      WHERE im.recipient_id = ?
      ORDER BY im.created_at DESC
    `, [userId]);

    console.log(`✅ Found ${result.rows.length} inbox messages for user ${userId}`);

    res.json({
      success: true,
      messages: result.rows,
      data: result.rows
    });

  } catch (error: any) {
    console.error('❌ Error fetching inbox:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error fetching inbox' 
    });
  }
});

// GET /api/inbox/unread-count - Get unread message count
router.get('/unread-count', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    
    const result = await database.query(
      'SELECT COUNT(*) as count FROM inbox_messages WHERE recipient_id = ? AND is_read = FALSE',
      [userId]
    );

    res.json({
      success: true,
      count: result.rows[0]?.count || 0
    });

  } catch (error: any) {
    console.error('❌ Error fetching unread count:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error fetching unread count' 
    });
  }
});

// GET /api/inbox/:id - Get single inbox message (user must be recipient)
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    console.log(`📬 GET /api/inbox/${id} - Fetching message for user ${userId}`);

    const result = await database.query(`
      SELECT 
        im.id,
        im.title,
        im.description,
        im.is_read,
        im.created_at,
        im.pdf_path,
        CASE WHEN im.pdf_path IS NOT NULL AND im.pdf_path != '' THEN TRUE ELSE FALSE END as has_pdf,
        sender.name as sender_name
      FROM inbox_messages im
      LEFT JOIN users sender ON im.sender_id = sender.id
      WHERE im.id = ? AND im.recipient_id = ?
    `, [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Inbox message not found or access denied' 
      });
    }

    // Mark as read
    await database.query(
      'UPDATE inbox_messages SET is_read = TRUE WHERE id = ?',
      [id]
    );

    console.log(`✅ Found inbox message ${id}`);

    res.json({
      success: true,
      message: result.rows[0],
      data: result.rows[0]
    });

  } catch (error: any) {
    console.error('❌ Error fetching inbox message:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error fetching inbox message' 
    });
  }
});

// ============================================================================
// PROTECTED PDF STREAMING ENDPOINT
// ============================================================================

// GET /api/inbox/:id/pdf - Stream PDF securely (user must be recipient)
router.get('/:id/pdf', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const isAdmin = req.user?.is_admin || req.user?.isAdmin;
    
    console.log(`📄 GET /api/inbox/${id}/pdf - Streaming PDF for user ${userId}`);

    // Check access: user must be recipient OR admin
    let query = 'SELECT pdf_path FROM inbox_messages WHERE id = ?';
    let params: any[] = [id];

    if (!isAdmin) {
      query += ' AND recipient_id = ?';
      params.push(userId);
    }

    const result = await database.query(query, params);

    if (result.rows.length === 0) {
      console.warn(`⛔ Access denied to inbox PDF ${id} for user ${userId}`);
      return res.status(404).json({ 
        success: false, 
        error: 'PDF not found or access denied' 
      });
    }

    const pdfFilename = result.rows[0].pdf_path;
    
    // Check if this message has a PDF
    if (!pdfFilename) {
      return res.status(404).json({ 
        success: false, 
        error: 'This message does not have a PDF attachment' 
      });
    }
    
    // Sanitize filename to prevent path traversal attacks
    const sanitizedFilename = path.basename(pdfFilename);
    if (sanitizedFilename !== pdfFilename || pdfFilename.includes('..')) {
      console.error(`❌ Path traversal attempt detected: ${pdfFilename}`);
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid file path' 
      });
    }
    
    const pdfPath = path.join(PRIVATE_INBOX_DIR, sanitizedFilename);

    // Check if file exists
    if (!fs.existsSync(pdfPath)) {
      console.error(`❌ PDF file not found: ${pdfPath}`);
      return res.status(404).json({ 
        success: false, 
        error: 'PDF file not found' 
      });
    }

    // Get file stats
    const stat = fs.statSync(pdfPath);

    // Set headers for secure streaming
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', 'inline'); // Display in browser, not download
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    // Prevent caching and embedding
    res.setHeader('X-Content-Type-Options', 'nosniff');

    console.log(`✅ Streaming PDF ${sanitizedFilename} (${stat.size} bytes)`);

    // Stream the file with error handling
    const readStream = fs.createReadStream(pdfPath);
    
    readStream.on('error', (err) => {
      console.error('❌ Error reading PDF file:', err);
      if (!res.headersSent) {
        res.status(500).json({ 
          success: false, 
          error: 'Error reading PDF file' 
        });
      }
    });
    
    readStream.pipe(res);

  } catch (error: any) {
    console.error('❌ Error streaming PDF:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error streaming PDF' 
    });
  }
});

export { router as inboxRoutes };
export default router;
