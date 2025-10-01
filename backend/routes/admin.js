const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const adminController = require('../controllers/adminController');

// All admin routes require authentication and admin role
router.use(authMiddleware);
router.use(adminMiddleware);

// Get system statistics
router.get('/stats', adminController.getSystemStats);

// Download database backup
router.get('/backup/download', adminController.downloadDatabaseBackup);

// User management
router.get('/users', adminController.getAllUsers);
router.put('/users/role', adminController.updateUserRole);

module.exports = router;