const express = require('express');
const router = express.Router();
const multer = require('multer');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const adminController = require('../controllers/adminController');

// Configure multer for file uploads (in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only JSON files
    if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
      cb(null, true);
    } else {
      cb(new Error('Only JSON files are allowed'), false);
    }
  }
});

// All admin routes require authentication and admin role
router.use(authMiddleware);
router.use(adminMiddleware);

// Get system statistics
router.get('/stats', adminController.getSystemStats);

// Download database backup
router.get('/backup/download', adminController.downloadDatabaseBackup);

// Restore database from backup
router.post('/backup/restore', upload.single('backupFile'), adminController.restoreDatabaseFromBackup);

// User management
router.get('/users', adminController.getAllUsers);
router.put('/users/role', adminController.updateUserRole);

module.exports = router;