const express = require('express');
const router = express.Router();
const { logPracticeSession } = require('../controllers/practiceController');
const authMiddleware = require('../middleware/authMiddleware');

// Practice logging routes (all require authentication)
router.post('/log', authMiddleware, logPracticeSession);

module.exports = router;