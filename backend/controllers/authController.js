const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../config/database');

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'braille-typing-practice-jwt-secret-2025';

const signup = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        error: 'Username and password are required'
      });
    }

    if (username.trim() === '' || password.trim() === '') {
      return res.status(400).json({
        error: 'Username and password are required'
      });
    }

    const db = getDb();

    // Check if user already exists
    const existingUser = await db.selectOne('users', { username });

    if (existingUser) {
      return res.status(400).json({
        error: 'Username already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const result = await db.insert('users', {
      username,
      password: hashedPassword
    });
    const userId = result.lastID;

    // Store user data in session
    req.session.user = {
      id: userId,
      username: username
    };

    // Generate JWT token for backward compatibility
    const token = jwt.sign(
      { userId: userId, username: username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token: token,
      user: {
        id: userId,
        username: username
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        error: 'Username and password are required'
      });
    }

    const db = getDb();

    // Find user
    const user = await db.selectOne('users', { username });

    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // Store user data in session
    req.session.user = {
      id: user.id,
      username: user.username
    };

    // Generate JWT token for backward compatibility
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token: token,
      user: {
        id: user.id,
        username: user.username
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

const logout = async (req, res) => {
  try {
    // Destroy session
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
        return res.status(500).json({
          error: 'Failed to logout'
        });
      }

      res.json({
        message: 'Logout successful'
      });
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

const getUser = async (req, res) => {
  try {
    console.log('🔍 getUser called');
    console.log('📊 Session user:', req.session?.user);
    console.log('🔑 JWT user:', req.user);
    console.log('📋 Headers:', req.headers.authorization);

    // Check for user data from auth middleware (JWT or session)
    if (!req.user) {
      console.log('❌ No req.user found');
      return res.status(401).json({
        error: 'Not authenticated'
      });
    }

    console.log('✅ Returning user:', req.user);
    res.json({
      user: req.user
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

module.exports = {
  signup,
  login,
  logout,
  getUser
};