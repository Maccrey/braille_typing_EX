const { getDb } = require('../config/database');

const getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const db = getDb();

    // Get total practice time
    const totalPracticeTime = await new Promise((resolve, reject) => {
      db.get(
        'SELECT COALESCE(SUM(duration_seconds), 0) as total FROM practice_logs WHERE user_id = ?',
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row.total);
        }
      );
    });

    // Get total attendance days
    const totalattendanceDays = await new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as count FROM attendance WHERE user_id = ?',
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        }
      );
    });

    // Get normal work days count
    const normalWorkDays = await new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as count FROM attendance WHERE user_id = ? AND is_work_day = 1',
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        }
      );
    });

    // Calculate average daily practice
    const averageDailyPractice = totalattendanceDays > 0
      ? Math.round(totalPracticeTime / totalattendanceDays)
      : 0;

    // Get first practice date
    const firstPracticeDate = await new Promise((resolve, reject) => {
      db.get(
        'SELECT MIN(practiced_at) as first_date FROM practice_logs WHERE user_id = ?',
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
        'SELECT MAX(practiced_at) as last_date FROM practice_logs WHERE user_id = ?',
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
        'SELECT COALESCE(MAX(duration_seconds), 0) as longest FROM practice_logs WHERE user_id = ?',
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
      total_attendance_days: totalattendanceDays,
      normal_work_days: normalWorkDays,
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

const getattendanceData = async (req, res) => {
  try {
    const userId = req.user.id;
    const { month } = req.query; // Format: YYYY-MM
    const db = getDb();

    // If no month specified, use current month
    const targetMonth = month || new Date().toISOString().slice(0, 7);

    // Get attendance dates for the specified month with work status
    const attendanceRecords = await new Promise((resolve, reject) => {
      db.all(
        'SELECT date, check_in_time, check_out_time, is_work_day FROM attendance WHERE user_id = ? AND date LIKE ? ORDER BY date',
        [userId, `${targetMonth}%`],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // Extract just dates for backward compatibility
    const attendanceDates = attendanceRecords.map(row => row.date);

    // Get total attendance count
    const totalDays = await new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as count FROM attendance WHERE user_id = ?',
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        }
      );
    });

    res.status(200).json({
      attendance_dates: attendanceDates,
      attendance_records: attendanceRecords,
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

const checkIn = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const now = new Date();
    const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS format

    const db = getDb();

    // Check if already checked in today
    const existingRecord = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM attendance WHERE user_id = ? AND date = ?',
        [userId, today],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (existingRecord && existingRecord.check_in_time) {
      return res.status(400).json({
        error: 'Already checked in today',
        check_in_time: existingRecord.check_in_time
      });
    }

    // Insert or update attendance record
    if (existingRecord) {
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE attendance SET check_in_time = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?',
          [currentTime, existingRecord.id],
          function(err) {
            if (err) reject(err);
            else resolve(this.changes);
          }
        );
      });
    } else {
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO attendance (user_id, date, check_in_time, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
          [userId, today, currentTime],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });
    }

    res.status(200).json({
      message: 'Check-in successful',
      date: today,
      check_in_time: currentTime
    });

  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

const checkOut = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const now = new Date();
    const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS format

    const db = getDb();

    // Check if already checked in today
    const existingRecord = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM attendance WHERE user_id = ? AND date = ?',
        [userId, today],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!existingRecord || !existingRecord.check_in_time) {
      return res.status(400).json({
        error: 'Must check in first'
      });
    }

    if (existingRecord.check_out_time) {
      return res.status(400).json({
        error: 'Already checked out today',
        check_out_time: existingRecord.check_out_time
      });
    }

<<<<<<< HEAD
    // Check if this constitutes a valid work day (9:05 이하 출근 ~ 17:45 이상 퇴근)
=======
    // Check if this constitutes a valid work day (before 9:05 ~ after 17:45)
>>>>>>> 68f36f3 (서버 포트 4000포트로 변경출퇴근 시간 기준을 모두)
    const checkInTime = new Date(`${today}T${existingRecord.check_in_time}`);
    const checkOutTime = new Date(`${today}T${currentTime}`);

    const workDayStart = new Date(`${today}T09:05:00`);
<<<<<<< HEAD
    const workDayEnd = new Date(`${today}T17:40:00`);

    // 정상 근무: 9:05 이하에 출근 AND 17:40 이상에 퇴근
    const isWorkDay = checkInTime <= workDayStart && checkOutTime >= workDayEnd;
=======
    const workDayEnd = new Date(`${today}T17:45:00`);

    // 정상 근무: 9:05 이전에 출근 AND 17:45 이후에 퇴근
    const isWorkDay = checkInTime < workDayStart && checkOutTime > workDayEnd;
>>>>>>> 68f36f3 (서버 포트 4000포트로 변경출퇴근 시간 기준을 모두)

    // Update attendance record
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE attendance SET check_out_time = ?, is_work_day = ? WHERE id = ?',
        [currentTime, isWorkDay ? 1 : 0, existingRecord.id],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });

    res.status(200).json({
      message: 'Check-out successful',
      date: today,
      check_in_time: existingRecord.check_in_time,
      check_out_time: currentTime,
      is_work_day: isWorkDay
    });

  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

const getTodayAttendance = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    const db = getDb();

    const todayRecord = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM attendance WHERE user_id = ? AND date = ?',
        [userId, today],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

<<<<<<< HEAD
    // Parse work_details if it exists
    if (todayRecord && todayRecord.work_details) {
      try {
        todayRecord.work_details = JSON.parse(todayRecord.work_details);
      } catch (e) {
        todayRecord.work_details = [];
      }
    }

=======
>>>>>>> 68f36f3 (서버 포트 4000포트로 변경출퇴근 시간 기준을 모두)
    res.status(200).json({
      date: today,
      attendance: todayRecord || null
    });

  } catch (error) {
    console.error('Get today attendance error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

<<<<<<< HEAD
const addWorkItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { description } = req.body;
    const today = new Date().toISOString().split('T')[0];

    if (!description || description.trim() === '') {
      return res.status(400).json({
        error: 'Work description is required'
      });
    }

    const db = getDb();

    // Get or create today's attendance record
    let attendanceRecord = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM attendance WHERE user_id = ? AND date = ?',
        [userId, today],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    let workDetails = [];

    if (attendanceRecord) {
      // Parse existing work details
      if (attendanceRecord.work_details) {
        try {
          workDetails = JSON.parse(attendanceRecord.work_details);
        } catch (e) {
          workDetails = [];
        }
      }
    } else {
      // Create new attendance record
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO attendance (user_id, date, work_details, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
          [userId, today, '[]'],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });
    }

    // Add new work item
    const newWorkItem = {
      id: Date.now(),
      description: description.trim(),
      completed: false,
      created_at: new Date().toISOString()
    };

    workDetails.push(newWorkItem);

    // Update attendance record
    await new Promise((resolve, reject) => {
      db.run(
        attendanceRecord
          ? 'UPDATE attendance SET work_details = ? WHERE user_id = ? AND date = ?'
          : 'INSERT INTO attendance (work_details, user_id, date, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        attendanceRecord
          ? [JSON.stringify(workDetails), userId, today]
          : [JSON.stringify(workDetails), userId, today],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes || this.lastID);
        }
      );
    });

    res.status(201).json({
      message: 'Work item added successfully',
      work_item: newWorkItem,
      total_items: workDetails.length
    });

  } catch (error) {
    console.error('Add work item error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

const updateWorkItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;
    const { completed, description } = req.body;
    const today = new Date().toISOString().split('T')[0];

    const db = getDb();

    // Get today's attendance record
    const attendanceRecord = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM attendance WHERE user_id = ? AND date = ?',
        [userId, today],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!attendanceRecord || !attendanceRecord.work_details) {
      return res.status(404).json({
        error: 'No work items found for today'
      });
    }

    let workDetails = [];
    try {
      workDetails = JSON.parse(attendanceRecord.work_details);
    } catch (e) {
      return res.status(400).json({
        error: 'Invalid work details format'
      });
    }

    // Find and update work item
    const itemIndex = workDetails.findIndex(item => item.id == itemId);
    if (itemIndex === -1) {
      return res.status(404).json({
        error: 'Work item not found'
      });
    }

    if (completed !== undefined) {
      workDetails[itemIndex].completed = !!completed;
    }
    if (description !== undefined) {
      workDetails[itemIndex].description = description.trim();
    }
    workDetails[itemIndex].updated_at = new Date().toISOString();

    // Update attendance record
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE attendance SET work_details = ? WHERE user_id = ? AND date = ?',
        [JSON.stringify(workDetails), userId, today],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });

    res.status(200).json({
      message: 'Work item updated successfully',
      work_item: workDetails[itemIndex]
    });

  } catch (error) {
    console.error('Update work item error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

=======
>>>>>>> 68f36f3 (서버 포트 4000포트로 변경출퇴근 시간 기준을 모두)
module.exports = {
  getUserStats,
  getattendanceData,
  checkIn,
  checkOut,
<<<<<<< HEAD
  getTodayAttendance,
  addWorkItem,
  updateWorkItem
=======
  getTodayAttendance
>>>>>>> 68f36f3 (서버 포트 4000포트로 변경출퇴근 시간 기준을 모두)
};