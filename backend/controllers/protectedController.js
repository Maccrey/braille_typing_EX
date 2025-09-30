const { getDb } = require('../config/database');

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

const getStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const db = getDb();

    // Get practice logs statistics
    const practiceStats = await new Promise((resolve, reject) => {
      const query = `
        SELECT
          COUNT(*) as totalSessions,
          SUM(duration_seconds) as totalPracticeTime,
          AVG(duration_seconds) as averageSessionTime,
          COUNT(DISTINCT DATE(practiced_at)) as practiceDays
        FROM practice_logs
        WHERE user_id = ?
      `;

      db.get(query, [userId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || {
            totalSessions: 0,
            totalPracticeTime: 0,
            averageSessionTime: 0,
            practiceDays: 0
          });
        }
      });
    });

    // Get weekly statistics (last 7 days)
    const weeklyStats = await new Promise((resolve, reject) => {
      const query = `
        SELECT
          SUM(duration_seconds) as weeklyPracticeTime,
          COUNT(DISTINCT DATE(practiced_at)) as weeklyPracticeDays
        FROM practice_logs
        WHERE user_id = ? AND practiced_at >= date('now', '-7 days')
      `;

      db.get(query, [userId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || {
            weeklyPracticeTime: 0,
            weeklyPracticeDays: 0
          });
        }
      });
    });

    // Combine statistics
    const stats = {
      totalSessions: practiceStats.totalSessions || 0,
      totalPracticeTime: practiceStats.totalPracticeTime || 0,
      averageSessionTime: practiceStats.averageSessionTime || 0,
      practiceDays: practiceStats.practiceDays || 0,
      weeklyPracticeTime: weeklyStats.weeklyPracticeTime || 0,
      weeklyPracticeDays: weeklyStats.weeklyPracticeDays || 0
    };

    res.json(stats);

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

const getPracticeLogs = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;
    const db = getDb();

    const logs = await new Promise((resolve, reject) => {
      const query = `
        SELECT
          DATE(practiced_at) as date,
          SUM(duration_seconds) as duration,
          COUNT(*) as session_count
        FROM practice_logs
        WHERE user_id = ?
        GROUP BY DATE(practiced_at)
        ORDER BY DATE(practiced_at) DESC
        LIMIT ?
      `;

      db.all(query, [userId, limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });

    res.json(logs);

  } catch (error) {
    console.error('Get practice logs error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

const logPracticeSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const { duration } = req.body;
    const db = getDb();

    if (!duration || duration <= 0) {
      return res.status(400).json({ error: 'Valid duration is required' });
    }

    await new Promise((resolve, reject) => {
      const query = `
        INSERT INTO practice_logs (user_id, duration_seconds, practiced_at)
        VALUES (?, ?, date('now'))
      `;

      db.run(query, [userId, duration], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });

    res.status(201).json({ message: 'Practice session logged successfully' });

  } catch (error) {
    console.error('Log practice session error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

module.exports = {
  getProfile,
  // getStats removed - use profileController.getUserStats instead
  getPracticeLogs,
  logPracticeSession
};