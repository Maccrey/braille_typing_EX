const express = require('express');
const router = express.Router();
const { signup, login, logout, getUser, changePassword, checkUsernameAvailability } = require('../controllers/authController');
const { validateSignup, validateLogin } = require('../middleware/validation');
const authMiddleware = require('../middleware/authMiddleware');

// Authentication routes with validation
router.post('/signup', validateSignup, signup);
router.post('/login', validateLogin, login);
router.post('/logout', logout);
router.get('/user', authMiddleware, getUser);
router.post('/change-password', authMiddleware, changePassword);
router.get('/check-username', checkUsernameAvailability);

module.exports = router;