const request = require('supertest');
const app = require('../app');
const { getDb, closeDb } = require('../config/database');
const fs = require('fs');
const path = require('path');

describe('Authentication API Tests', () => {
  let db;
  let originalGetDb;
  const testDbPath = path.join(__dirname, '..', 'test-auth.db');

  beforeEach(async () => {
    // Remove test database if it exists
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // Create fresh test database
    const sqlite3 = require('sqlite3').verbose();
    db = new sqlite3.Database(testDbPath);

    // Create Users table for testing
    await new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE Users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Clear the require cache to force fresh module loading
    delete require.cache[require.resolve('../config/database')];
    delete require.cache[require.resolve('../controllers/authController')];

    // Override database path in the database module
    const originalDbPath = require('path').join(__dirname, '..', 'database.db');
    process.env.TEST_DB_PATH = testDbPath;
  });

  afterEach(async () => {
    // Clean up environment
    delete process.env.TEST_DB_PATH;

    if (db) {
      await new Promise((resolve) => {
        db.close((err) => {
          if (err) console.error('Error closing test database:', err);
          resolve();
        });
      });
    }
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('POST /api/auth/signup', () => {
    test('should create a new user with valid credentials', async () => {
      const userData = {
        username: 'testuser' + Math.random(),
        password: 'testpassword123'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect('Content-Type', /json/)
        .expect(201);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('userId');
      expect(response.body.message).toBe('User created successfully');
      expect(typeof response.body.userId).toBe('number');
    });

    test('should hash the password before storing', async () => {
      const userData = {
        username: 'testuser2' + Math.random(),
        password: 'plainpassword'
      };

      await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      // Check if password is hashed in database (using main database for simplicity)
      const { getDb } = require('../config/database');
      const mainDb = getDb();
      const user = await new Promise((resolve, reject) => {
        mainDb.get('SELECT * FROM Users WHERE username = ?', [userData.username], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      await new Promise((resolve) => {
        mainDb.close(() => resolve());
      });

      expect(user).toBeDefined();
      expect(user.password).not.toBe(userData.password);
      expect(user.password).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt hash pattern
    });

    test('should reject duplicate usernames', async () => {
      const userData = {
        username: 'duplicateuser' + Math.random(),
        password: 'password123'
      };

      // Create first user
      await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      // Try to create user with same username
      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Username already exists');
    });

    test('should reject empty username', async () => {
      const userData = {
        username: '',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Username and password are required');
    });

    test('should reject empty password', async () => {
      const userData = {
        username: 'testuser',
        password: ''
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Username and password are required');
    });

    test('should reject missing username field', async () => {
      const userData = {
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Username and password are required');
    });

    test('should reject missing password field', async () => {
      const userData = {
        username: 'testuser'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Username and password are required');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      const testUser = {
        username: 'logintest' + Math.random(),
        password: 'testpassword123'
      };

      await request(app)
        .post('/api/auth/signup')
        .send(testUser)
        .expect(201);

      // Store username for use in tests
      this.testUsername = testUser.username;
      this.testPassword = testUser.password;
    });

    test('should login successfully with valid credentials', async () => {
      const loginData = {
        username: this.testUsername,
        password: this.testPassword
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.message).toBe('Login successful');
      expect(typeof response.body.token).toBe('string');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('username');
      expect(response.body.user.username).toBe(this.testUsername);
    });

    test('should verify JWT token structure', async () => {
      const loginData = {
        username: this.testUsername,
        password: this.testPassword
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      const token = response.body.token;
      expect(token).toMatch(/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/); // JWT format

      // Verify token can be decoded (basic structure test)
      const jwt = require('jsonwebtoken');
      const decoded = jwt.decode(token);
      expect(decoded).toHaveProperty('userId');
      expect(decoded).toHaveProperty('username');
      expect(decoded.username).toBe(this.testUsername);
    });

    test('should reject invalid username', async () => {
      const loginData = {
        username: 'nonexistentuser',
        password: 'anypassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Invalid credentials');
    });

    test('should reject invalid password', async () => {
      const loginData = {
        username: this.testUsername,
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Invalid credentials');
    });

    test('should reject empty username', async () => {
      const loginData = {
        username: '',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Username and password are required');
    });

    test('should reject empty password', async () => {
      const loginData = {
        username: 'testuser',
        password: ''
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Username and password are required');
    });

    test('should reject missing username field', async () => {
      const loginData = {
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Username and password are required');
    });

    test('should reject missing password field', async () => {
      const loginData = {
        username: 'testuser'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Username and password are required');
    });
  });

  describe('JWT Authentication Middleware', () => {
    let validToken;
    let testUserId;

    beforeEach(async () => {
      // Create a test user and get valid token
      const testUser = {
        username: 'middlewaretest' + Math.random(),
        password: 'testpassword123'
      };

      await request(app)
        .post('/api/auth/signup')
        .send(testUser)
        .expect(201);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send(testUser)
        .expect(200);

      validToken = loginResponse.body.token;
      testUserId = loginResponse.body.user.id;
    });

    test('should allow access to protected route with valid token', async () => {
      const response = await request(app)
        .get('/api/protected/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.id).toBe(testUserId);
    });

    test('should reject access without token', async () => {
      const response = await request(app)
        .get('/api/protected/profile')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Access token required');
    });

    test('should reject access with invalid token', async () => {
      const response = await request(app)
        .get('/api/protected/profile')
        .set('Authorization', 'Bearer invalid-token-here')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Invalid token');
    });

    test('should reject access with malformed Authorization header', async () => {
      const response = await request(app)
        .get('/api/protected/profile')
        .set('Authorization', 'InvalidFormat token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Invalid token format');
    });

    test('should reject access with expired token', async () => {
      // Create a token with very short expiration for testing
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { userId: testUserId, username: 'test' },
        process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        { expiresIn: '1ms' } // Expires immediately
      );

      // Wait a bit to ensure token is expired
      await new Promise(resolve => setTimeout(resolve, 10));

      const response = await request(app)
        .get('/api/protected/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Token expired');
    });

    test('should add user information to request object', async () => {
      const response = await request(app)
        .get('/api/protected/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      // The response should contain user info that was added by middleware
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('username');
      expect(typeof response.body.user.id).toBe('number');
      expect(typeof response.body.user.username).toBe('string');
    });

    test('should allow access to multiple protected routes with same token', async () => {
      // Test first protected route
      const response1 = await request(app)
        .get('/api/protected/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      // Test second protected route
      const response2 = await request(app)
        .get('/api/protected/stats')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response1.body.user.id).toBe(response2.body.user.id);
    });
  });
});