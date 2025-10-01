// Admin authorization middleware

const adminMiddleware = (req, res, next) => {
  try {
    console.log('🔐 Admin middleware - checking user role');
    console.log('👤 User from req:', req.user);

    // Check if user is authenticated
    if (!req.user) {
      console.log('❌ No user found in request');
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    // Check if user is admin
    if (req.user.role !== 'admin') {
      console.log(`❌ User ${req.user.username} is not admin (role: ${req.user.role})`);
      return res.status(403).json({
        error: 'Admin access required'
      });
    }

    console.log(`✅ Admin access granted for user: ${req.user.username}`);
    next();

  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

module.exports = adminMiddleware;