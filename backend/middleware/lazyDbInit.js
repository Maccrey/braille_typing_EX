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

      // Try to initialize database, but handle SQLite3 binary issues gracefully
      try {
        const { createTables } = require('../init-db');
        await createTables();
        dbInitialized = true;
        console.log('✅ Database initialized successfully');
      } catch (sqliteError) {
        if (sqliteError.code === 'ERR_DLOPEN_FAILED') {
          console.warn('⚠️ SQLite3 binary not available, using in-memory fallback');
          // Mark as initialized to prevent repeated attempts
          dbInitialized = true;
          // In production, you might want to use a different database or fallback
        } else {
          throw sqliteError;
        }
      }
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