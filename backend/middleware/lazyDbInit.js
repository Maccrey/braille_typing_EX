// Lazy database initialization middleware
let dbInitialized = false;

const lazyDbInit = async (req, res, next) => {
  // Skip initialization for health check and static files
  if (req.path === '/api/health' || !req.path.startsWith('/api/')) {
    return next();
  }

  if (!dbInitialized) {
    try {
      console.log('🔧 Initializing JSON database on first API request...');

      const { initDatabase } = require('../config/database');
      await initDatabase();
      dbInitialized = true;
      console.log('✅ JSON Database initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize database:', error);
      return res.status(500).json({
        error: 'Database initialization failed',
        message: 'Database service temporarily unavailable'
      });
    }
  }

  next();
};

module.exports = lazyDbInit;