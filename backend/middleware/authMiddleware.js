const jwt = require('jsonwebtoken');
const { getDb } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const authMiddleware = async (req, res, next) => {
  try {
    console.log('🔐 AuthMiddleware called for:', req.path);
    console.log('🍪 Session:', req.session?.user);
    console.log('🔑 Auth header:', req.headers.authorization?.substring(0, 20) + '...');

    // First check for session-based authentication
    if (req.session && req.session.user) {
      console.log('✅ Session auth successful');
      req.user = {
        id: req.session.user.id,
        username: req.session.user.username
      };
      return next();
    }

    // Fallback to JWT token authentication for backward compatibility
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    // Check if header format is correct
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Invalid token format'
      });
    }

    // Extract token
    const token = authHeader.substring(7); // Remove "Bearer " prefix

    if (!token) {
      return res.status(401).json({
        error: 'Access token required'
      });
    }

    // Verify token
    let decoded;
    try {
      console.log('🔍 Verifying JWT token...');
      decoded = jwt.verify(token, JWT_SECRET);
      console.log('✅ JWT decoded:', { userId: decoded.userId, username: decoded.username });
    } catch (error) {
      console.log('❌ JWT verification failed:', error.message);
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Token expired'
        });
      } else if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          error: 'Invalid token'
        });
      } else {
        return res.status(401).json({
          error: 'Token verification failed'
        });
      }
    }

    // Get user from database to verify user still exists
    console.log('🔍 Looking up user in database...');
    const db = getDb();
    const user = await db.selectOne('users', { id: decoded.userId });

    if (!user) {
      console.log('❌ User not found in database:', decoded.userId);
      return res.status(401).json({
        error: 'User not found'
      });
    }

    console.log('✅ User found:', { id: user.id, username: user.username });

    // Add user information to request object
    req.user = {
      id: user.id,
      username: user.username
    };

    console.log('✅ req.user set, calling next()');
    // Continue to next middleware/route handler
    next();

  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

module.exports = authMiddleware;