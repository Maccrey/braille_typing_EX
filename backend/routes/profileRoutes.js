const express = require('express');
const router = express.Router();
<<<<<<< HEAD
const { getUserStats, getattendanceData, checkIn, checkOut, getTodayAttendance, addWorkItem, updateWorkItem } = require('../controllers/profileController');
=======
const { getUserStats, getattendanceData, checkIn, checkOut, getTodayAttendance } = require('../controllers/profileController');
>>>>>>> 68f36f3 (서버 포트 4000포트로 변경출퇴근 시간 기준을 모두)
const authMiddleware = require('../middleware/authMiddleware');

// Profile routes (all require authentication)
router.get('/stats', authMiddleware, getUserStats);
router.get('/attendance', authMiddleware, getattendanceData);
router.get('/attendance/today', authMiddleware, getTodayAttendance);
router.post('/attendance/checkin', authMiddleware, checkIn);
router.post('/attendance/checkout', authMiddleware, checkOut);
<<<<<<< HEAD
router.post('/attendance/work', authMiddleware, addWorkItem);
router.put('/attendance/work/:itemId', authMiddleware, updateWorkItem);
=======
>>>>>>> 68f36f3 (서버 포트 4000포트로 변경출퇴근 시간 기준을 모두)

module.exports = router;