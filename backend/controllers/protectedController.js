const getProfile = (req, res) => {
  try {
    // req.user is set by authMiddleware
    res.json({
      message: 'Profile data retrieved successfully',
      user: req.user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

const getStats = (req, res) => {
  try {
    // req.user is set by authMiddleware
    res.json({
      message: 'User statistics retrieved successfully',
      user: req.user,
      stats: {
        totalPracticeTime: 0,
        attendanceDays: 0,
        lastLogin: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

module.exports = {
  getProfile,
  getStats
};