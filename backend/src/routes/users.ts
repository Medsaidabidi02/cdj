import express from 'express';
import bcrypt from 'bcrypt';
import database from '../config/database';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { adminRateLimiter } from '../middleware/rateLimiter';

const router = express.Router();

console.log('👥 FIXED Users API loaded for Medsaidabidi02 - 2025-09-09 15:12:54');

// Helpers
const generateEmailFromName = (name: string) => {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9.]/g, '');
  const suffix = Math.floor(100 + Math.random() * 900);
  return `${base}.${suffix}@cliniquejuristes.com`;
};

const generatePassword = () => {
  return (
    Math.random().toString(36).slice(-6) +
    Math.random().toString(36).toUpperCase().slice(-2) +
    '!' +
    Math.floor(10 + Math.random() * 89)
  );
};

// Create a new user (admin)
router.post('/create', async (req, res) => {
  try {
    const { name, email, password, isAdmin = false, isApproved = false } = req.body;

    console.log('➕ POST /api/users/create - Creating user for Medsaidabidi02 at 2025-09-09 15:12:54');
    console.log('📝 User data:', { name, email: email ? 'provided' : 'will generate', isAdmin, isApproved });

    if (!name) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    const finalEmail = email && email.trim() !== '' ? email.trim().toLowerCase() : generateEmailFromName(name);
    const finalPassword = password && password.trim() !== '' ? password : generatePassword();

    // Check duplicate
    const existing = await database.query('SELECT id FROM users WHERE email = ?', [finalEmail]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    const hashed = await bcrypt.hash(finalPassword, 10);

    // Insert user
    const insertResult = await database.query(`
      INSERT INTO users (name, email, password, is_admin, is_approved)
      VALUES (?, ?, ?, ?, ?)
    `, [name, finalEmail, hashed, isAdmin, isApproved]);

    // Get the created user
    const newUser = await database.query(
      'SELECT id, name, email, is_admin, is_approved, created_at, updated_at FROM users WHERE id = ?',
      [insertResult.insertId]
    );

    console.log('✅ User created successfully for Medsaidabidi02:', newUser.rows[0]);

    return res.json({
      success: true,
      message: 'User created successfully',
      user: newUser.rows[0],
      credentials: {
        email: finalEmail,
        password: finalPassword
      }
    });
  } catch (error) {
    console.error('❌ Error creating user for Medsaidabidi02:', error);
    return res.status(500).json({ success: false, message: 'Error creating user' });
  }
});

// Get all users (admin)
router.get('/', async (req, res) => {
  try {
    console.log('📋 GET /api/users - Fetching all users for Medsaidabidi02 at 2025-09-09 15:12:54');
    
    const result = await database.query(`
      SELECT id, name, email, is_admin, is_approved, is_logged_in, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
    `);
    
    console.log(`✅ Found ${result.rows.length} users for Medsaidabidi02`);
    res.json({ success: true, users: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('❌ Error fetching users for Medsaidabidi02:', error);
    res.status(500).json({ success: false, message: 'Error fetching users' });
  }
});

// Approve user
router.put('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔄 PUT /api/users/${id}/approve - Approving user for Medsaidabidi02 at 2025-09-09 15:12:54`);

    // Update user approval status
    await database.query('UPDATE users SET is_approved = true WHERE id = ?', [id]);

    // Get the updated user
    const result = await database.query(
      'SELECT id, name, email, is_admin, is_approved, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    console.log(`✅ User ${id} approved by Medsaidabidi02`);
    res.json({ success: true, message: 'User approved', user: result.rows[0] });
  } catch (error) {
    console.error(`❌ Error approving user ${req.params.id} for Medsaidabidi02:`, error);
    res.status(500).json({ success: false, message: 'Error approving user' });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, isAdmin, isApproved } = req.body;

    console.log(`🔄 PUT /api/users/${id} - Updating user for Medsaidabidi02 at 2025-09-09 15:12:54`);
    console.log('📝 Update data:', { name, email, isAdmin, isApproved });

    const fields: string[] = [];
    const values: any[] = [];

    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (email !== undefined) { fields.push('email = ?'); values.push(email); }
    if (isAdmin !== undefined) { fields.push('is_admin = ?'); values.push(isAdmin); }
    if (isApproved !== undefined) { fields.push('is_approved = ?'); values.push(isApproved); }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    // Add updated_at field
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id); // Add id at the end for WHERE clause

    await database.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);

    // Get the updated user
    const result = await database.query(
      'SELECT id, name, email, is_admin, is_approved, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    console.log(`✅ User ${id} updated by Medsaidabidi02`);
    res.json({ success: true, message: 'User updated', user: result.rows[0] });
  } catch (error) {
    console.error(`❌ Error updating user ${req.params.id} for Medsaidabidi02:`, error);
    res.status(500).json({ success: false, message: 'Error updating user' });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ DELETE /api/users/${id} - Deleting user for Medsaidabidi02 at 2025-09-09 15:12:54`);

    // Check if user exists first
    const userCheck = await database.query('SELECT id, name, email FROM users WHERE id = ?', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const userName = userCheck.rows[0].name;

    // Delete the user
    await database.query('DELETE FROM users WHERE id = ?', [id]);

    console.log(`✅ User ${id} (${userName}) deleted by Medsaidabidi02`);
    res.json({ success: true, message: 'User deleted', deletedUser: { id, name: userName } });
  } catch (error) {
    console.error(`❌ Error deleting user ${req.params.id} for Medsaidabidi02:`, error);
    res.status(500).json({ success: false, message: 'Error deleting user' });
  }
});

// Reset user password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    console.log('🔑 POST /api/users/reset-password - Resetting password for Medsaidabidi02 at 2025-09-09 15:12:54');
    console.log('📧 Email:', email);

    if (!email || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email and new password are required' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    // Update password
    await database.query('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?', [hashed, email]);

    // Get the updated user
    const result = await database.query(
      'SELECT id, name, email, is_admin, is_approved FROM users WHERE email = ?',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    console.log(`✅ Password reset successful for ${email} by Medsaidabidi02`);
    res.json({ 
      success: true, 
      message: 'Password reset successful', 
      user: result.rows[0], 
      newPassword 
    });
  } catch (error) {
    console.error('❌ Error resetting password for Medsaidabidi02:', error);
    res.status(500).json({ success: false, message: 'Error resetting password' });
  }
});

// Get full user details including login status and last 2 devices (admin only)
router.get('/:id/details', adminRateLimiter, authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 GET /api/users/${id}/details - Fetching full user details (admin: ${req.user?.id})`);

    const result = await database.query(
      'SELECT id, name, email, is_admin, is_approved, is_logged_in, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = result.rows[0];

    // Fetch last 2 device records (most recent first)
    let lastDevices: Array<{ ip_address: string; browser_name: string; os_name: string; logged_in_at: string }> = [];
    try {
      const devResult = await database.query(
        `SELECT ip_address, browser_name, os_name, logged_in_at
           FROM user_login_devices
          WHERE user_id = ?
          ORDER BY logged_in_at DESC
          LIMIT 2`,
        [id]
      );
      lastDevices = devResult.rows;
    } catch {
      // Table may not exist yet on older deployments – degrade gracefully
      lastDevices = [];
    }

    console.log(`✅ Found user ${id} details (${lastDevices.length} device record(s))`);
    
    res.json({ 
      success: true, 
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        is_admin: user.is_admin,
        is_approved: user.is_approved,
        is_logged_in: user.is_logged_in || false,
        created_at: user.created_at,
        updated_at: user.updated_at,
        // Last 2 login devices for the admin panel
        last_devices: lastDevices
      }
    });
  } catch (error) {
    console.error(`❌ Error fetching user details for ${req.params.id}:`, error);
    res.status(500).json({ success: false, message: 'Error fetching user details' });
  }
});

// Update user password by ID (admin only)
router.post('/:id/update-password', adminRateLimiter, authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    console.log(`🔑 POST /api/users/${id}/update-password - Updating user password (admin: ${req.user?.id})`);

    if (!newPassword) {
      return res.status(400).json({ success: false, message: 'New password is required' });
    }

    // Password validation: minimum 6 characters
    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    // Check if user exists
    const userCheck = await database.query('SELECT id, name, email FROM users WHERE id = ?', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Hash the new password using bcrypt (same method as existing auth)
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await database.query(
      'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedPassword, id]
    );

    console.log(`✅ Password updated for user ${id}`);
    res.json({ 
      success: true, 
      message: 'Password updated successfully',
      user: userCheck.rows[0]
    });
  } catch (error) {
    console.error(`❌ Error updating password for user ${req.params.id}:`, error);
    res.status(500).json({ success: false, message: 'Error updating password' });
  }
});

// Force logout user by setting is_logged_in = 0 (admin only)
router.post('/:id/force-logout', adminRateLimiter, authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    console.log(`🚪 POST /api/users/${id}/force-logout - Forcing user logout (admin: ${req.user?.id})`);

    // Check if user exists
    const userCheck = await database.query('SELECT id, name, email, is_logged_in FROM users WHERE id = ?', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Set is_logged_in = 0 to force the user out
    await database.query(
      'UPDATE users SET is_logged_in = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );

    console.log(`✅ User ${id} forcibly logged out`);
    res.json({ 
      success: true, 
      message: 'User logged out successfully',
      user: {
        id: userCheck.rows[0].id,
        name: userCheck.rows[0].name,
        email: userCheck.rows[0].email,
        is_logged_in: false
      }
    });
  } catch (error) {
    console.error(`❌ Error forcing logout for user ${req.params.id}:`, error);
    res.status(500).json({ success: false, message: 'Error forcing user logout' });
  }
});

// Logout ALL users at once (admin only)
router.post('/logout-all', adminRateLimiter, authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    console.log(`🚪 POST /api/users/logout-all - Forcing all users logout (admin: ${req.user?.id})`);

    // Count how many are currently logged in
    const countResult = await database.query(
      'SELECT COUNT(*) AS cnt FROM users WHERE is_logged_in = 1'
    );
    const count = Number(countResult.rows[0]?.cnt ?? 0);

    // Set is_logged_in = 0 for every user (the middleware check will reject their JWTs)
    await database.query(
      'UPDATE users SET is_logged_in = 0, updated_at = CURRENT_TIMESTAMP WHERE is_logged_in = 1'
    );

    console.log(`✅ ${count} user(s) forcibly logged out by admin ${req.user?.id}`);
    res.json({
      success: true,
      message: `${count} utilisateur(s) déconnecté(s) avec succès`,
      count
    });
  } catch (error) {
    console.error('❌ Error forcing logout for all users:', error);
    res.status(500).json({ success: false, message: 'Error forcing all users logout' });
  }
});

export { router as usersRoutes };
export default router;

console.log('👥 Users routes module loaded for Medsaidabidi02 at 2025-09-09 15:12:54');