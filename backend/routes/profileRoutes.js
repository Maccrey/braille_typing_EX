const express = require('express');
const router = express.Router();
const { getUserStats, getattendanceData } = require('../controllers/profileController');
const authMiddleware = require('../middleware/authMiddleware');

// Profile routes (all require authentication)
router.get('/stats', authMiddleware, getUserStats);
router.get('/attendance', authMiddleware, getattendanceData);

module.exports = router;