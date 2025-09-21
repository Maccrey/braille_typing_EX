const { getDb } = require('../config/database');

const getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const db = getDb();

    // Get total practice time
    const totalPracticeTime = await new Promise((resolve, reject) => {
      db.get(
        'SELECT COALESCE(SUM(duration_seconds), 0) as total FROM PracticeLogs WHERE user_id = ?',
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row.total);
        }
      );
    });

    // Get total attendance days
    const totalAttendanceDays = await new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as count FROM Attendance WHERE user_id = ?',
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        }
      );
    });

    // Calculate average daily practice
    const averageDailyPractice = totalAttendanceDays > 0
      ? Math.round(totalPracticeTime / totalAttendanceDays)
      : 0;

    // Get first practice date
    const firstPracticeDate = await new Promise((resolve, reject) => {
      db.get(
        'SELECT MIN(practiced_at) as first_date FROM PracticeLogs WHERE user_id = ?',
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row.first_date);
        }
      );
    });

    // Get last practice date
    const lastPracticeDate = await new Promise((resolve, reject) => {
      db.get(
        'SELECT MAX(practiced_at) as last_date FROM PracticeLogs WHERE user_id = ?',
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row.last_date);
        }
      );
    });

    // Get longest session
    const longestSession = await new Promise((resolve, reject) => {
      db.get(
        'SELECT COALESCE(MAX(duration_seconds), 0) as longest FROM PracticeLogs WHERE user_id = ?',
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row.longest);
        }
      );
    });

    // Build response
    const stats = {
      total_practice_time: totalPracticeTime,
      total_attendance_days: totalAttendanceDays,
      average_daily_practice: averageDailyPractice,
      longest_session: longestSession,
      stats_period: `${firstPracticeDate || 'N/A'} ~ ${lastPracticeDate || 'N/A'}`
    };

    // Add optional fields only if they exist
    if (firstPracticeDate) {
      stats.first_practice_date = firstPracticeDate;
    }
    if (lastPracticeDate) {
      stats.last_practice_date = lastPracticeDate;
    }

    res.status(200).json(stats);

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

const getAttendanceData = async (req, res) => {
  try {
    const userId = req.user.id;
    const { month } = req.query; // Format: YYYY-MM
    const db = getDb();

    // If no month specified, use current month
    const targetMonth = month || new Date().toISOString().slice(0, 7);

    // Get attendance dates for the specified month
    const attendanceDates = await new Promise((resolve, reject) => {
      db.all(
        'SELECT date FROM Attendance WHERE user_id = ? AND date LIKE ? ORDER BY date',
        [userId, `${targetMonth}%`],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows.map(row => row.date));
        }
      );
    });

    // Get total attendance count
    const totalDays = await new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as count FROM Attendance WHERE user_id = ?',
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        }
      );
    });

    res.status(200).json({
      attendance_dates: attendanceDates,
      current_month: targetMonth,
      total_days: totalDays
    });

  } catch (error) {
    console.error('Get attendance data error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

module.exports = {
  getUserStats,
  getAttendanceData
};