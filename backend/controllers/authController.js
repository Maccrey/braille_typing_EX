const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb, getAuth } = require('../config/firebase');

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
    const auth = getAuth();

    // Check if user already exists in Firestore
    const usersRef = db.collection('users');
    const existingUserQuery = await usersRef.where('username', '==', username).limit(1).get();

    if (!existingUserQuery.empty) {
      return res.status(400).json({
        error: 'Username already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Check if this is the first user (admin user) or if username is 'maccrey'
    const isAdmin = username === 'maccrey';

    // Create Firebase Auth user (using username as email)
    const userEmail = `${username}@braille-typing.local`;
    let firebaseUser;

    try {
      firebaseUser = await auth.createUser({
        email: userEmail,
        password: password,
        displayName: username
      });
    } catch (authError) {
      console.error('Firebase Auth error:', authError);
      return res.status(500).json({
        error: 'Failed to create authentication user'
      });
    }

    // Create user document in Firestore
    const userDoc = {
      uid: firebaseUser.uid,
      username,
      password: hashedPassword, // Store hashed password for backward compatibility
      role: isAdmin ? 'admin' : 'user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const userRef = await usersRef.add(userDoc);
    const userId = userRef.id;

    // Store user data in session
    req.session.user = {
      id: userId,
      username: username,
      uid: firebaseUser.uid
    };

    // Generate JWT token for backward compatibility
    const token = jwt.sign(
      { userId: userId, username: username, role: isAdmin ? 'admin' : 'user', uid: firebaseUser.uid },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token: token,
      user: {
        id: userId,
        username: username,
        role: isAdmin ? 'admin' : 'user',
        uid: firebaseUser.uid
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

    // Find user in Firestore
    const usersRef = db.collection('users');
    const userQuery = await usersRef.where('username', '==', username).limit(1).get();

    if (userQuery.empty) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    const userDoc = userQuery.docs[0];
    const user = { id: userDoc.id, ...userDoc.data() };

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
      username: user.username,
      uid: user.uid
    };

    // Generate JWT token for backward compatibility
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role || 'user', uid: user.uid },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token: token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role || 'user',
        uid: user.uid
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

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id; // From auth middleware

    console.log(`🔄 Password change request for user ID: ${userId}`);

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: '현재 패스워드와 새 패스워드가 필요합니다'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: '새 패스워드는 최소 6자 이상이어야 합니다'
      });
    }

    const db = getDb();
    const auth = getAuth();

    // Get current user from Firestore
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        error: '사용자를 찾을 수 없습니다'
      });
    }

    const user = userDoc.data();

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        error: '현재 패스워드가 일치하지 않습니다'
      });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update password in Firestore
    await db.collection('users').doc(userId).update({
      password: hashedNewPassword,
      updated_at: new Date().toISOString()
    });

    // Update Firebase Auth password if uid exists
    if (user.uid) {
      try {
        await auth.updateUser(user.uid, {
          password: newPassword
        });
      } catch (authError) {
        console.error('Firebase Auth password update error:', authError);
        // Continue even if Firebase Auth update fails (for backward compatibility)
      }
    }

    console.log(`✅ Password changed successfully for user ID: ${userId}`);

    res.status(200).json({
      message: '패스워드가 성공적으로 변경되었습니다'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: '서버 오류가 발생했습니다'
    });
  }
};

const checkUsernameAvailability = async (req, res) => {
  try {
    const { username } = req.query;

    console.log(`🔍 Checking username availability for: ${username}`);

    // Validate input
    if (!username || username.trim() === '') {
      return res.status(400).json({
        error: '사용자명이 필요합니다'
      });
    }

    if (username.trim().length < 3) {
      return res.status(400).json({
        error: '사용자명은 최소 3글자 이상이어야 합니다'
      });
    }

    const db = getDb();

    // Check if username already exists in Firestore
    const usersRef = db.collection('users');
    const existingUserQuery = await usersRef.where('username', '==', username.trim()).limit(1).get();

    if (!existingUserQuery.empty) {
      console.log(`❌ Username '${username}' is already taken`);
      return res.status(200).json({
        available: false,
        message: '이미 사용 중인 사용자명입니다'
      });
    }

    console.log(`✅ Username '${username}' is available`);
    res.status(200).json({
      available: true,
      message: '사용 가능한 사용자명입니다'
    });

  } catch (error) {
    console.error('Check username availability error:', error);
    res.status(500).json({
      error: '서버 오류가 발생했습니다'
    });
  }
};

module.exports = {
  signup,
  login,
  logout,
  getUser,
  changePassword,
  checkUsernameAvailability
};
