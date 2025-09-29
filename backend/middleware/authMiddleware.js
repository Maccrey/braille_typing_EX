const jwt = require('jsonwebtoken');
const { getDb } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'braille-typing-practice-jwt-secret-2025';

const authMiddleware = async (req, res, next) => {
  try {
    console.log('🔐 AuthMiddleware called for:', req.path);
    console.log('🍪 Session:', req.session?.user);
    console.log('🔑 Auth header:', req.headers.authorization?.substring(0, 20) + '...');

    // Primary: Check for session-based authentication
    if (req.session && req.session.user) {
      console.log('✅ Session auth successful');
      req.user = {
        id: req.session.user.id,
        username: req.session.user.username
      };
      return next();
    }

    // Secondary: For frontend requests without session, validate JWT token PROPERLY
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      try {
        // PROPER JWT verification with secret and expiration check
        const payload = jwt.verify(token, JWT_SECRET);

        if (payload.userId && payload.username) {
          console.log('✅ JWT auth successful with proper verification');
          req.user = {
            id: payload.userId,
            username: payload.username
          };
          return next();
        }
      } catch (tokenError) {
        console.log('❌ JWT verification failed:', tokenError.message);
        // Token is invalid or expired
      }
    }

    // If no valid authentication found
    console.log('❌ No valid authentication found');
    return res.status(401).json({
      error: 'Authentication required'
    });

  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

module.exports = authMiddleware;