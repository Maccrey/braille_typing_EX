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

      // Get user role from database for session-based auth
      try {
        const db = getDb();
        const user = await db.selectOne('users', { id: req.session.user.id });

        req.user = {
          id: req.session.user.id,
          username: req.session.user.username,
          role: user?.role || 'user'
        };
        console.log('👤 Set req.user from session with role:', req.user);
        return next();
      } catch (dbError) {
        console.log('⚠️ Failed to get user role from database, using default:', dbError.message);
        req.user = {
          id: req.session.user.id,
          username: req.session.user.username,
          role: 'user'
        };
        console.log('👤 Set req.user from session (default role):', req.user);
        return next();
      }
    }

    // Secondary: For frontend requests without session, validate JWT token PROPERLY
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('🔍 Extracted token:', token.substring(0, 20) + '...');
      console.log('🔍 Full token length:', token.length);

      try {
        // PROPER JWT verification with secret and expiration check
        console.log('🔑 Using JWT_SECRET:', JWT_SECRET.substring(0, 10) + '... (length: ' + JWT_SECRET.length + ')');
        console.log('🔍 Token parts:', token.split('.').length);

        const payload = jwt.verify(token, JWT_SECRET);
        console.log('✅ JWT payload decoded:', payload);
        console.log('✅ Payload userId:', payload.userId);
        console.log('✅ Payload username:', payload.username);

        if (payload.userId && payload.username) {
          console.log('✅ JWT auth successful with proper verification');
          req.user = {
            id: payload.userId,
            username: payload.username,
            role: payload.role || 'user'
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