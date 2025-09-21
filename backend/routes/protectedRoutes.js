const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getProfile, getStats } = require('../controllers/protectedController');

// Apply auth middleware to all routes in this router
router.use(authMiddleware);

// Protected routes
router.get('/profile', getProfile);
router.get('/stats', getStats);

module.exports = router;