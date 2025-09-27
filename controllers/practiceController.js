const { getDb } = require('../config/database');

const logPracticeSession = async (req, res) => {
  try {
    const { duration_seconds, practiced_at } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!duration_seconds || !practiced_at) {
      return res.status(400).json({
        error: 'Duration and practice date are required'
      });
    }

    // Validate positive duration
    if (duration_seconds <= 0) {
      return res.status(400).json({
        error: 'Duration must be positive'
      });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(practiced_at)) {
      return res.status(400).json({
        error: 'Invalid date format. Expected YYYY-MM-DD'
      });
    }

    const db = getDb();

    // Insert practice log
    const practiceLogId = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO practice_logs (user_id, duration_seconds, practiced_at) VALUES (?, ?, ?)',
        [userId, duration_seconds, practiced_at],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    // Check if attendance record exists for this date
    const existingAttendance = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id FROM attendance WHERE user_id = ? AND date = ?',
        [userId, practiced_at],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    let attendanceCreated = false;

    // Create attendance record if doesn't exist
    if (!existingAttendance) {
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO attendance (user_id, date) VALUES (?, ?)',
          [userId, practiced_at],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });
      attendanceCreated = true;
    }

    // Get the created practice log
    const practiceLog = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM practice_logs WHERE id = ?',
        [practiceLogId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    res.status(201).json({
      message: 'Practice session logged successfully',
      practice_log: practiceLog,
      attendance_created: attendanceCreated
    });

  } catch (error) {
    console.error('Practice logging error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

module.exports = {
  logPracticeSession
};