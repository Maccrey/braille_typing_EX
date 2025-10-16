const { getDb } = require('../config/firebase');

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

    // Create practice log data
    const practiceLog = {
      user_id: userId,
      duration_seconds: duration_seconds,
      practiced_at: practiced_at,
      created_at: new Date().toISOString()
    };

    // Insert practice log
    const practiceLogRef = await db.collection('practice_logs').add(practiceLog);
    const insertedLog = { id: practiceLogRef.id, ...practiceLog };
    console.log('✅ Practice log inserted:', insertedLog);

    // Check if attendance record exists for this date
    const existingAttendanceSnapshot = await db.collection('attendance')
      .where('user_id', '==', userId)
      .where('date', '==', practiced_at)
      .limit(1)
      .get();

    let attendanceCreated = false;

    // Create attendance record if doesn't exist
    if (existingAttendanceSnapshot.empty) {
      const attendanceData = {
        user_id: userId,
        date: practiced_at,
        created_at: new Date().toISOString()
      };

      await db.collection('attendance').add(attendanceData);
      attendanceCreated = true;
      console.log('✅ Attendance record created for date:', practiced_at);
    }

    res.status(201).json({
      message: 'Practice session logged successfully',
      practice_log: insertedLog,
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