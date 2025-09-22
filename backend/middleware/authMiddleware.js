const jwt = require('jsonwebtoken');
const { getDb } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const authMiddleware = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: 'Access token required'
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
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
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
    const db = getDb();
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT id, username FROM users WHERE id = ?', [decoded.userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      return res.status(401).json({
        error: 'User not found'
      });
    }

    // Add user information to request object
    req.user = {
      id: user.id,
      username: user.username
    };

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