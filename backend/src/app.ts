import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import { usersRoutes } from './routes/users';
import { userCoursesRoutes } from './routes/userCourses';
import { debugRoutes } from './routes/debug';
import { authRoutes } from './routes/auth';
import { blogRoutes } from './routes/blog';
import { videoRoutes } from './routes/videos';
import { coursesRoutes } from './routes/courses';
import { subjectsRoutes } from './routes/subjects';
import { inboxRoutes } from './routes/inbox';
import { videoProgressRoutes } from './routes/videoProgress';
import { publicRoutes } from './routes/public';
import { notificationRoutes } from './routes/notifications';




  // Hide all console output
  console.log = () => {};
  console.error = () => {};
  console.warn = () => {};
  console.info = () => {};
  console.debug = () => {};
  console.trace = () => {};
  console.dir = () => {};
  console.time = () => {};
  console.timeEnd = () => {};
  console.assert = () => {};
  console.clear = () => {};
  console.count = () => {};
  console.countReset = () => {};
  console.group = () => {};
  console.groupCollapsed = () => {};

console.log('🚀 App starting for production deployment at', new Date().toISOString());

const app = express();

// Basic middleware
app.use(express.json({ limit: '5gb' }));
app.use(express.urlencoded({ extended: true, limit: '5gb' }));

// ---------------------------------------------------------------------------
// CORS configuration - Fixed for production
// ---------------------------------------------------------------------------
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      'https://cliniquedesjuristes.com',
      'https://www.cliniquedesjuristes.com'
    ]
  : [
      'http://localhost:3000', 
      'http://localhost:3001', 
      'http://localhost:5000',
      'http://localhost:5001'
    ];




const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like curl, mobile apps, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin as string) !== -1) {
      return callback(null, true);
    }
    // For development convenience
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'X-Session-Token'],
  exposedHeaders: ['Content-Range', 'X-Total-Count'],
  credentials: true,
  optionsSuccessStatus: 204
};


app.use(cors(corsOptions));
app.options('*', cors(corsOptions));


app.use('/api', (req, res, next) => {
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  next();
});

// Security middleware
if (process.env.NODE_ENV === 'production') {
  app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for now to avoid issues with React
    crossOriginEmbedderPolicy: false
  }));
  
  // Rate limiting for production
 // const limiter = rateLimit({
  //  windowMs: 15 * 60 * 1000, // 15 minutes
//    max: 200, // Increased limit for production
 //   message: 'Too many requests from this IP, please try again later.'
//  });
//  app.use('/api/', limiter);
  console.log('🔒 Security middleware enabled for production');
} else {
  console.log('⚠️ Rate limiting DISABLED for development');
}

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

console.log('📁 Static file serving disabled - using Hetzner public HLS only');

// Health check endpoint (before other routes)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Clinique des Juristes API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

app.get('/api/test-videos', (req, res) => {
  res.json({ message: 'Direct test route working', timestamp: new Date().toISOString() });
});

// ✅ Import and setup API routes in correct order
console.log('🔗 Setting up API routes...');

// Auth routes first (no authentication required)
app.use('/api/auth', authRoutes);
console.log('✅ Auth routes configured: /api/auth');

app.use('/api/public', publicRoutes);
console.log('✅ Public routes configured: /api/public');

// Then other routes that may require authentication
app.use('/api/videos', videoRoutes);
console.log('✅ Video routes configured: /api/videos');

app.use('/api/courses', coursesRoutes);
console.log('✅ Course routes configured: /api/courses');

app.use('/api/subjects', subjectsRoutes);
console.log('✅ Subject routes configured: /api/subjects');

app.use('/api/blog', blogRoutes);
console.log('✅ Blog routes configured: /api/blog');

app.use('/api/users', usersRoutes);
console.log('✅ User routes configured: /api/users');

app.use('/api/user-courses', userCoursesRoutes);
console.log('✅ User-courses routes configured: /api/user-courses');

app.use('/api/inbox', inboxRoutes);
console.log('✅ Inbox routes configured: /api/inbox');

app.use('/api/video-progress', videoProgressRoutes);
console.log('✅ Video Progress routes configured: /api/video-progress');

app.use('/api/notifications', notificationRoutes);
console.log('✅ Notification routes configured: /api/notifications');

// Debug routes last (usually admin only)
app.use('/api/debug', debugRoutes);
console.log('✅ Debug routes configured: /api/debug');

console.log('🔗 All API routes configured successfully');

// ✅ Serve uploads directory for blog images
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
console.log('📁 Serving uploads from:', path.join(__dirname, '../uploads'));

// Profile pictures directory
const PROFILES_DIR = path.join(__dirname, '../uploads/profiles');
const fs = require('fs');
if (!fs.existsSync(PROFILES_DIR)) {
  fs.mkdirSync(PROFILES_DIR, { recursive: true });
}
app.use('/uploads/profiles', express.static(PROFILES_DIR));
console.log('📁 Serving profile pictures from:', PROFILES_DIR);

// ✅ Serve React static files (AFTER API routes but BEFORE catch-all)
if (process.env.NODE_ENV === 'production') {
  // Serve static files from React build
  app.use(express.static(path.join(__dirname, '../build')));
  console.log('📱 Serving React build files from:', path.join(__dirname, '../build'));
}

// API 404 handler - for API routes that don't exist
app.use('/api/*', (req, res) => {
  console.log(`❌ 404: API route not found: ${req.method} ${req.path}`);
  res.status(404).json({ 
    success: false,
    message: 'API endpoint not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    available_endpoints: [
      '/api/health',
      '/api/auth/*',
      '/api/videos/*',
      '/api/courses/*',
      '/api/subjects/*',
      '/api/blog/*',
      '/api/users/*',
      '/api/user-courses/*',
      '/api/inbox/*',
      '/api/debug/*'
    ]
  });
});



// ✅ React Router fallback (MUST be last)
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  // Handle React Router - return all non-API requests to React app
  app.get('*', (req, res) => {
    console.log(`🎯 Serving React app for route: ${req.path}`);
    res.sendFile(path.join(__dirname, '../build', 'index.html'));
  });
  console.log('🎯 React Router fallback configured');
} else {
  // Development fallback
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ 
        success: false,
        message: 'API endpoint not found in development',
        path: req.path,
        method: req.method
      });
    }
    res.json({ 
      message: 'Development server - React app should be running on port 3000',
      api_status: 'API server running',
      timestamp: new Date().toISOString()
    });
  });
}

// Global error handler (MUST be last)
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Global error handler:', {
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  // Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(isDevelopment && { 
      stack: error.stack,
      details: error.details 
    }),
    timestamp: new Date().toISOString(),
    path: req.path
  });
});

export default app;

console.log('✅ App configuration completed at', new Date().toISOString());

