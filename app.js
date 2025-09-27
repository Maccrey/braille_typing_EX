const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, 'frontend')));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.headers.authorization) {
    console.log(`  Authorization: ${req.headers.authorization.substring(0, 20)}...`);
  }
  next();
});

// Serve main frontend page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
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