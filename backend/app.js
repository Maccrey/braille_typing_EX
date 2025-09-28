const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);

const app = express();

// Session configuration
app.use(session({
  store: new SQLiteStore({
    db: 'sessions.db',
    dir: __dirname
  }),
  secret: process.env.SESSION_SECRET || 'braille-typing-session-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const frontendPath = path.join(__dirname, '..', 'frontend');

// Smart root route for health checks and serving the landing page
app.get('/', (req, res, next) => {
  const acceptHeader = req.get('Accept') || '';
  if (acceptHeader.includes('text/html')) {
    // Browser request, serve the landing page
    res.sendFile(path.join(frontendPath, 'index.html'));
  } else {
    // Health checker or API client, respond with JSON
    res.status(200).json({ message: 'Braille Typing Practice API is running' });
  }
});

// Serve frontend static files (for CSS, JS, other HTML files, etc.)
app.use(express.static(frontendPath));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.headers.authorization) {
    console.log(`  Authorization: ${req.headers.authorization.substring(0, 20)}...`);
  }
  next();
});

// Import routes
const authRoutes = require('./routes/authRoutes');
const protectedRoutes = require('./routes/protectedRoutes');
const practiceRoutes = require('./routes/practiceRoutes');
const profileRoutes = require('./routes/profileRoutes');
const postsRoutes = require('./routes/posts');
const commentsRoutes = require('./routes/comments');

// API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/protected', protectedRoutes);

// Practice routes
app.use('/api/practice', practiceRoutes);

// Profile routes
app.use('/api/profile', profileRoutes);

// Posts routes
app.use('/api/posts', postsRoutes);

// Comments routes
app.use('/api/comments', commentsRoutes);

// Import error handler
const errorHandler = require('./middleware/errorHandler');

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: '요청하신 경로를 찾을 수 없습니다.',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Global error handling middleware (must be last)
app.use(errorHandler);

module.exports = app;