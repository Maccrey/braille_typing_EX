const express = require('express');
const router = express.Router();
const { signup, login, logout, getUser } = require('../controllers/authController');
const { validateSignup, validateLogin } = require('../middleware/validation');

// Authentication routes with validation
router.post('/signup', validateSignup, signup);
router.post('/login', validateLogin, login);
router.post('/logout', logout);
router.get('/user', getUser);

module.exports = router;