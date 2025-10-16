// Lazy Firebase initialization middleware
let firebaseInitialized = false;

const lazyDbInit = async (req, res, next) => {
  // Skip initialization for health check and static files
  if (req.path === '/api/health' || !req.path.startsWith('/api/')) {
    return next();
  }

  if (!firebaseInitialized) {
    try {
      console.log('🔧 Initializing Firebase on first API request...');

      const { initializeFirebase } = require('../config/firebase');
      await initializeFirebase();
      firebaseInitialized = true;
      console.log('✅ Firebase initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Firebase:', error);
      return res.status(500).json({
        error: 'Firebase initialization failed',
        message: 'Database service temporarily unavailable',
        details: error.message
      });
    }
  }

  next();
};

module.exports = lazyDbInit;