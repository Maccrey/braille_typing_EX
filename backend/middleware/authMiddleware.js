const jwt = require('jsonwebtoken');
const { getDb } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'braille-typing-practice-jwt-secret-2025';

const authMiddleware = async (req, res, next) => {
  try {
    console.log('🔐 AuthMiddleware called for:', req.path);
    console.log('🍪 Session:', req.session?.user);
    console.log('🔑 Full auth header:', req.headers.authorization);

    // Primary: Check for session-based authentication
    if (req.session && req.session.user) {
      console.log('✅ Session auth successful');
      req.user = {
        id: req.session.user.id,
        username: req.session.user.username
      };
      console.log('👤 Set req.user from session:', req.user);
      return next();
    }

    // Secondary: For frontend requests without session, validate JWT token PROPERLY
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('🔍 Extracted token:', token.substring(0, 20) + '...');

      try {
        // PROPER JWT verification with secret and expiration check
        console.log('🔑 Using JWT_SECRET:', JWT_SECRET.substring(0, 10) + '...');
        const payload = jwt.verify(token, JWT_SECRET);
        console.log('✅ JWT payload decoded:', payload);

        if (payload.userId && payload.username) {
          console.log('✅ JWT auth successful with proper verification');
          req.user = {
            id: payload.userId,
            username: payload.username
          };
          console.log('👤 Set req.user from JWT:', req.user);
          return next();
        } else {
          console.log('❌ JWT payload missing userId or username');
        }
      } catch (tokenError) {
        console.log('❌ JWT verification failed:', tokenError.message);
        console.log('❌ Token error details:', tokenError.name);
        // Token is invalid or expired
      }
    } else {
      console.log('❌ No Bearer token found in Authorization header');
    }

    // If no valid authentication found
    console.log('❌ No valid authentication found - req.user will be null');
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