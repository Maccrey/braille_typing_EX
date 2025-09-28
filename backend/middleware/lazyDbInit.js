// Lazy database initialization middleware
let dbInitialized = false;

const lazyDbInit = async (req, res, next) => {
  // Skip initialization for health check and static files
  if (req.path === '/api/health' || !req.path.startsWith('/api/')) {
    return next();
  }

  if (!dbInitialized) {
    try {
      console.log('🔧 Initializing database on first API request...');
      const { createTables } = require('../init-db');
      await createTables();
      dbInitialized = true;
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize database:', error);
      return res.status(500).json({
        error: 'Database initialization failed',
        message: 'Please try again later'
      });
    }
  }

  next();
};

module.exports = lazyDbInit;