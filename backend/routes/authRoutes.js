const express = require('express');
const router = express.Router();
const { signup, login, logout, getUser } = require('../controllers/authController');
const { validateSignup, validateLogin } = require('../middleware/validation');
const authMiddleware = require('../middleware/authMiddleware');

// Authentication routes with validation
router.post('/signup', validateSignup, signup);
router.post('/login', validateLogin, login);
router.post('/logout', logout);
router.get('/user', authMiddleware, getUser);

module.exports = router;