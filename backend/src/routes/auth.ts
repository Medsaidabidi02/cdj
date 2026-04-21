import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import database from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { phoneUpdateRateLimiter } from '../middleware/rateLimiter';

const router = express.Router();

console.log('🔐 Auth API loaded');

const JWT_SECRET: string = process.env.JWT_SECRET || 'legal-education-platform-super-secret-key-medsaidabidi02-2025-mysql5-version';
// Make token lifetime configurable; longer in development for convenience
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || (process.env.NODE_ENV === 'production' ? '1h' : '7d');

// Constants
const MIN_PHONE_LENGTH = 8;
// Maximum device history rows kept per user in user_login_devices
const MAX_DEVICE_HISTORY = 10;

// ---------------------------------------------------------------------------
// Device-fingerprint helpers
// ---------------------------------------------------------------------------

/** Extract a human-readable browser name from a User-Agent string. */
function extractBrowser(ua: string): string {
  if (!ua) return 'Inconnu';
  if (/Edg\//i.test(ua))     return 'Edge';
  if (/OPR\//i.test(ua))     return 'Opera';
  if (/Chrome\//i.test(ua))  return 'Chrome';
  if (/Firefox\//i.test(ua)) return 'Firefox';
  if (/Safari\//i.test(ua))  return 'Safari';
  return 'Autre';
}

/** Extract a human-readable OS name from a User-Agent string. */
function extractOS(ua: string): string {
  if (!ua) return 'Inconnu';
  if (/iPhone|iPad/i.test(ua))  return 'iOS';
  if (/Android/i.test(ua))      return 'Android';
  if (/Windows NT/i.test(ua))   return 'Windows';
  if (/Mac OS X/i.test(ua))     return 'macOS';
  if (/Linux/i.test(ua))        return 'Linux';
  return 'Autre';
}

/**
 * Returns true if two user-agent strings represent the "same device"
 * (same browser family AND same OS family).
 */
function isSameDevice(ua1: string, ua2: string): boolean {
  return extractBrowser(ua1) === extractBrowser(ua2) &&
         extractOS(ua1)      === extractOS(ua2);
}

/** Get the real client IP, honouring proxy headers. */
function getClientIP(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || '0.0.0.0';
}

// ---------------------------------------------------------------------------
// Multer setup for profile pictures
// ---------------------------------------------------------------------------
const PROFILES_DIR = path.join(__dirname, '../../uploads/profiles');

if (!fs.existsSync(PROFILES_DIR)) {
  fs.mkdirSync(PROFILES_DIR, { recursive: true });
}

const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, PROFILES_DIR);
  },
  filename: (req, file, cb) => {
    const userId = (req as any).user?.id || 'unknown';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `profile-${userId}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const profileUpload = multer({
  storage: profileStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.test(ext) && allowedTypes.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Format d\'image non supporté (JPG, PNG, WEBP uniquement)'));
    }
  }
});

// ---------------------------------------------------------------------------
// Login route – device-based session security
// ---------------------------------------------------------------------------
// Rules:
//   • is_logged_in = 0 → allow login from any device
//   • is_logged_in = 1 → allow ONLY if current device matches the last device
//     used (same browser family + same OS family).  Otherwise block.
// On every successful login we record the device and set is_logged_in = 1.
// ---------------------------------------------------------------------------
router.post('/login', async (req, res) => {
  try {
    let { email, password } = req.body;

    console.log('🔐 Login attempt received:', { email });
    
    // Normalize input
    email = typeof email === 'string' ? email.trim().toLowerCase() : email;

    // Validate input
    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({
        success: false,
        message: 'Email et mot de passe requis'
      });
    }

    // Get user from database (including phone column and login status)
    const userResult = await database.query(
      'SELECT id, name, email, password, is_admin, is_approved, phone, profile_picture, is_logged_in, created_at FROM users WHERE LOWER(TRIM(email)) = ?',
      [email]
    );

    if (userResult.rows.length === 0) {
      console.log('❌ User not found:', email);
      return res.status(401).json({
        success: false,
        message: 'Identifiants invalides'
      });
    }

    const user = userResult.rows[0];
    console.log('👤 Found user:', { id: user.id, email: user.email, name: user.name });

    // Block login if account not approved — admins are always exempt
    if (!user.is_approved && !user.is_admin) {
      console.log('⛔ Account not approved:', user.id);
      return res.status(403).json({
        success: false,
        message: 'Compte non approuvé. Veuillez demander l\'approbation à un administrateur.'
      });
    }

    // Check password
    let isPasswordValid = false;
    if (user.password) {
      try {
        isPasswordValid = await bcrypt.compare(password, user.password);
      } catch (err) {
        console.error('❌ Password compare error:', err);
      }
    }

    if (!isPasswordValid) {
      console.log('❌ Invalid password for user:', user.id);
      return res.status(401).json({
        success: false,
        message: 'Identifiants invalides'
      });
    }

    // -----------------------------------------------------------------------
    // Device-based session check
    // If the user is currently marked as logged in, verify they are using the
    // same device (browser + OS) as the last recorded login.
    // Wrapped in try/catch: if the tracking table doesn't exist yet, we allow
    // the login and skip tracking (graceful degradation).
    // -----------------------------------------------------------------------
    const currentUA   = (req.headers['user-agent'] as string) || '';
    const currentIP   = getClientIP(req);
    const browserName = extractBrowser(currentUA);
    const osName      = extractOS(currentUA);

    try {
      // Admins bypass ALL device/session restrictions — they can log in from anywhere
      if (user.is_logged_in && !user.is_admin) {
        // Fetch the most recent device record for this user (IP + user-agent)
        const lastDeviceResult = await database.query(
          'SELECT ip_address, user_agent FROM user_login_devices WHERE user_id = ? ORDER BY logged_in_at DESC LIMIT 1',
          [user.id]
        );

        if (lastDeviceResult.rows.length > 0) {
          const lastIP: string  = lastDeviceResult.rows[0].ip_address || '';
          const lastUA: string  = lastDeviceResult.rows[0].user_agent || '';

          // Allow if IP matches OR device (browser+OS) matches.
          // Only block when BOTH are different.
          const ipMatch     = lastIP && lastIP === currentIP;
          const deviceMatch = isSameDevice(currentUA, lastUA);

          if (!ipMatch && !deviceMatch) {
            console.log(`⛔ IP+Device mismatch for user ${user.id}: lastIP=${lastIP} currentIP=${currentIP} lastDevice=${extractBrowser(lastUA)}/${extractOS(lastUA)} currentDevice=${browserName}/${osName}`);
            return res.status(403).json({
              success: false,
              message: 'Vous êtes déjà connecté sur un autre appareil. Veuillez vous déconnecter d\'abord.',
              deviceConflict: true,
              lastDevice: {
                browser: extractBrowser(lastUA),
                os: extractOS(lastUA)
              }
            });
          }
          console.log(`✅ Login allowed for user ${user.id} (ipMatch=${ipMatch}, deviceMatch=${deviceMatch})`);
        }
        // If no device record found but is_logged_in=1, allow login (edge case)
      } else if (user.is_admin) {
        console.log(`👑 Admin user ${user.id} — skipping all session/device restrictions`);
      }

      // -----------------------------------------------------------------------
      // Record device & mark as logged in
      // -----------------------------------------------------------------------

      // Insert device record
      await database.query(
        `INSERT INTO user_login_devices (user_id, ip_address, user_agent, browser_name, os_name, logged_in_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [user.id, currentIP, currentUA, browserName, osName]
      );

      // Prune old records – keep only the newest MAX_DEVICE_HISTORY rows
      await database.query(
        `DELETE FROM user_login_devices
         WHERE user_id = ?
           AND id NOT IN (
             SELECT id FROM (
               SELECT id FROM user_login_devices
               WHERE user_id = ?
               ORDER BY logged_in_at DESC
               LIMIT ?
             ) AS keep
           )`,
        [user.id, user.id, MAX_DEVICE_HISTORY]
      );

    } catch (deviceErr: any) {
      // If device tracking fails (e.g. table not yet created), log and continue.
      // Login itself must not be blocked by a missing tracking table.
      console.warn('⚠️ Device tracking unavailable, skipping:', deviceErr?.message || deviceErr);
    }

    // Always mark user as logged in regardless of whether device tracking succeeded.
    // This is a separate, unconditional update so it is never skipped.
    try {
      await database.query(
        'UPDATE users SET is_logged_in = 1 WHERE id = ?',
        [user.id]
      );
    } catch (loginFlagErr: any) {
      console.warn('⚠️ Could not set is_logged_in flag:', loginFlagErr?.message || loginFlagErr);
    }

    // Generate JWT token
    const token = jwt.sign(
      {  
        id: user.id,
        email: user.email,
        isAdmin: user.is_admin
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN as any }
    );
    
    console.log(`🎫 JWT created for user ${user.id} from ${browserName}/${osName} @ ${currentIP}`);

    // Check if user has a phone number - if not, they'll need to add one
    const needsPhoneVerification = !user.phone || user.phone.trim() === '';

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || null,
        profile_picture: user.profile_picture || null,
        isAdmin: user.is_admin || false,
        is_admin: user.is_admin || false
      },
      needsPhoneVerification
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Register route (for new users)
router.post('/register', async (req, res) => {
  try {
    let { name, email, password } = req.body;

    console.log('📝 Registration attempt received for Medsaidabidi02 at 2025-09-09 15:17:20');
    console.log('📝 Registration data:', { name, email: email ? 'provided' : 'missing' });

    // Validate input
    if (!name || !email || !password) {
      console.log('❌ Missing required fields for registration by Medsaidabidi02');
      return res.status(400).json({
        success: false,
        message: 'Nom, email et mot de passe requis'
      });
    }

    // Normalize input
    email = email.trim().toLowerCase();
    name = name.trim();

    // Check if user already exists
    const existingUser = await database.query('SELECT id FROM users WHERE LOWER(TRIM(email)) = ?', [email]);
    if (existingUser.rows.length > 0) {
      console.log('❌ User already exists with email:', email, 'by Medsaidabidi02');
      return res.status(409).json({
        success: false,
        message: 'Un utilisateur avec cet email existe déjà'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user (not approved by default, not admin)
    const result = await database.query(
      'INSERT INTO users (name, email, password, is_admin, is_approved) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashedPassword, false, false]
    );

    // Get the created user
    const newUser = await database.query(
      'SELECT id, name, email, is_admin, is_approved, created_at FROM users WHERE id = ?',
      [result.insertId]
    );

    console.log('✅ User registered successfully for Medsaidabidi02:', newUser.rows[0]);

    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès. En attente d\'approbation.',
      user: newUser.rows[0]
    });

  } catch (error) {
    console.error('❌ Registration error for Medsaidabidi02:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'inscription'
    });
  }
});

// Admin helper: reset password for any user (POST /api/auth/reset-password-admin)
router.post('/reset-password-admin', async (req, res) => {
  try {
    let { email, newPassword } = req.body;
    console.log('🔧 Password reset attempt for admin by Medsaidabidi02 at 2025-09-09 15:17:20');
    console.log('📧 Target email:', email);

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email est requis' });
    }

    email = String(email).trim().toLowerCase();
    newPassword = newPassword && String(newPassword).trim() !== '' 
      ? String(newPassword) 
      : (Math.random().toString(36).slice(-8) + 'A!');

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await database.query('UPDATE users SET password = ?, updated_at = NOW() WHERE LOWER(TRIM(email)) = ?', [hashedPassword, email]);

    // Get updated user
    const result = await database.query('SELECT id, name, email, is_admin, is_approved FROM users WHERE LOWER(TRIM(email)) = ?', [email]);

    if (result.rows.length === 0) {
      console.log('❌ Reset password: user not found for email', email, 'by Medsaidabidi02');
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    console.log('🔧 Password reset for user by Medsaidabidi02:', result.rows[0]);
    res.json({
      success: true,
      message: 'Mot de passe mis à jour',
      user: result.rows[0],
      credentials: {
        email,
        password: newPassword
      }
    });
  } catch (error) {
    console.error('❌ Error resetting password (admin) for Medsaidabidi02:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Change password (for authenticated users)
router.put('/change-password', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non autorisé' });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Mot de passe actuel et nouveau mot de passe requis'
      });
    }

    // Get user from database
    const userResult = await database.query('SELECT password FROM users WHERE id = ?', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    const user = userResult.rows[0];

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ success: false, message: 'Mot de passe actuel incorrect' });
    }

    // Hash and update new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await database.query('UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?', [hashedNewPassword, userId]);

    console.log(`✅ Password changed successfully for user: ${userId}`);
    res.json({
      success: true,
      message: 'Mot de passe mis à jour avec succès'
    });
  } catch (error) {
    console.error('❌ Error changing password:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * PUT /api/auth/profile
 * Update user's general profile info (name, email, phone)
 */
router.put('/profile', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { name, email, phone } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non autorisé' });
    }

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Le nom et l\'email sont requis' });
    }

    // Check if email is already taken by another user
    const existingUser = await database.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ?',
      [email.trim(), userId]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Cet email est déjà utilisé' });
    }

    // Update user
    await database.query(
      'UPDATE users SET name = ?, email = ?, phone = ?, updated_at = NOW() WHERE id = ?',
      [name.trim(), email.trim().toLowerCase(), phone?.trim() || null, userId]
    );

    // Get updated user data
    const userResult = await database.query(
      'SELECT id, name, email, phone, profile_picture, is_admin FROM users WHERE id = ?',
      [userId]
    );

    res.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      user: {
        ...userResult.rows[0],
        isAdmin: userResult.rows[0].is_admin
      }
    });
  } catch (error) {
    console.error('❌ Error updating profile:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur lors de la mise à jour du profil' });
  }
});

/**
 * POST /api/auth/profile-picture
 * Upload and update user's profile picture
 */
router.post('/profile-picture', authenticateToken, profileUpload.single('avatar'), async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non autorisé' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Aucun fichier fourni' });
    }

    const picturePath = `/uploads/profiles/${req.file.filename}`;

    // Update database
    await database.query(
      'UPDATE users SET profile_picture = ?, avatar_updated_at = NOW(), updated_at = NOW() WHERE id = ?',
      [picturePath, userId]
    );

    res.json({
      success: true,
      message: 'Photo de profil mise à jour',
      profile_picture: picturePath
    });
  } catch (error: any) {
    console.error('❌ Error uploading profile picture:', error);
    res.status(500).json({ success: false, message: error.message || 'Erreur lors de l\'upload' });
  }
});

// Verify token endpoint
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'Token d\'accès requis' });
    }

    let token = authHeader;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Token invalide ou expiré' });
    }

    // Get fresh user data from database
    const userResult = await database.query(
      'SELECT id, name, email, phone, profile_picture, is_admin, is_approved FROM users WHERE id = ?',
      [decoded.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    const user = userResult.rows[0];

    // Check if user is still approved — admins are always exempt
    if (!user.is_approved && !user.is_admin) {
      return res.status(403).json({ success: false, message: 'Compte non approuvé' });
    }

    console.log('✅ Token verified successfully for user:', user.id, 'by Medsaidabidi02');
    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || null,
        profile_picture: user.profile_picture || null,
        isAdmin: user.is_admin || false,
        is_admin: user.is_admin || false
      }
    });

  } catch (error) {
    console.error('❌ Error verifying token for Medsaidabidi02:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Debug route: list all users (keeps existing behavior)
router.get('/debug-users', async (req, res) => {
  try {
    console.log('🔍 Listing users (debug) for Medsaidabidi02 at 2025-09-09 15:17:20');
    const result = await database.query('SELECT id, name, email, is_admin, is_approved, created_at FROM users ORDER BY id');
    console.log('📊 Users for Medsaidabidi02:', result.rows);
    res.json({ success: true, users: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('❌ Error listing users for Medsaidabidi02:', error);
    res.status(500).json({ success: false, message: 'Error checking users' });
  }
});

// Logout endpoint – clears is_logged_in so the user can log in from any device next time
router.post('/logout', async (req, res) => {
  try {
    console.log('👋 Logout request received');
    
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      let token = authHeader;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }

      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        console.log(`👋 Logout for user ${decoded.id}`);
        // Mark user as logged out so they can re-login from any device
        await database.query('UPDATE users SET is_logged_in = 0 WHERE id = ?', [decoded.id]);
      } catch (error) {
        // Token expired/invalid – still treat as a successful logout
        console.warn('⚠️ Could not decode token for logout (may be expired):', error);
      }
    }
    
    res.json({
      success: true,
      message: 'Déconnexion réussie'
    });
  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la déconnexion' });
  }
});

// Update phone number endpoint - requires authentication with rate limiting
router.post('/update-phone', phoneUpdateRateLimiter, async (req, res) => {
  try {
    const { phone, phoneConfirm } = req.body;
    
    console.log('📱 Phone update request received');
    
    // Extract user from token
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'Token d\'accès requis' });
    }

    let token = authHeader;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Token invalide ou expiré' });
    }

    // Validate phone numbers
    if (!phone || !phoneConfirm) {
      return res.status(400).json({
        success: false,
        message: 'Les deux champs de numéro de téléphone sont requis'
      });
    }

    // Normalize phone numbers (remove spaces, etc.)
    const normalizedPhone = phone.trim().replace(/\s+/g, '');
    const normalizedPhoneConfirm = phoneConfirm.trim().replace(/\s+/g, '');

    // Check if phones match
    if (normalizedPhone !== normalizedPhoneConfirm) {
      return res.status(400).json({
        success: false,
        message: 'Les numéros de téléphone ne correspondent pas'
      });
    }

    // Basic phone format validation (international format allowed)
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/;
    if (!phoneRegex.test(normalizedPhone) || normalizedPhone.length < MIN_PHONE_LENGTH) {
      return res.status(400).json({
        success: false,
        message: 'Format de numéro de téléphone invalide'
      });
    }

    // Update phone in database
    await database.query(
      'UPDATE users SET phone = ?, updated_at = NOW() WHERE id = ?',
      [normalizedPhone, decoded.id]
    );

    console.log(`✅ Phone updated for user ${decoded.id}: ${normalizedPhone}`);

    // Get updated user data
    const userResult = await database.query(
      'SELECT id, name, email, phone, is_admin, is_approved FROM users WHERE id = ?',
      [decoded.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    const user = userResult.rows[0];

    res.json({
      success: true,
      message: 'Numéro de téléphone mis à jour avec succès',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        profile_picture: user.profile_picture || null,
        isAdmin: user.is_admin || false,
        is_admin: user.is_admin || false
      }
    });

  } catch (error) {
    console.error('❌ Phone update error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour du numéro de téléphone' });
  }
});

console.log('🔐 Auth routes module loaded');

export { router as authRoutes };
export default router;