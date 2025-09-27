const express = require('express');
const router = express.Router();
const { getUserStats, getattendanceData, checkIn, checkOut, getTodayAttendance, addWorkItem, updateWorkItem, getDailyRanking } = require('../controllers/profileController');
const authMiddleware = require('../middleware/authMiddleware');

// Profile routes (all require authentication)
router.get('/stats', authMiddleware, getUserStats);
router.get('/attendance', authMiddleware, getattendanceData);
router.get('/attendance/today', authMiddleware, getTodayAttendance);
router.post('/attendance/checkin', authMiddleware, checkIn);
router.post('/attendance/checkout', authMiddleware, checkOut);
router.post('/attendance/work', authMiddleware, addWorkItem);
router.put('/attendance/work/:itemId', authMiddleware, updateWorkItem);
router.get('/ranking/daily', authMiddleware, getDailyRanking);

module.exports = router;