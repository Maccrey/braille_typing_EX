const request = require('supertest');
const path = require('path');
const fs = require('fs');
const { getDb, closeDb } = require('../config/database');

// Set test database path
const testDbPath = path.join(__dirname, 'test_profile.db');
process.env.TEST_DB_PATH = testDbPath;

const app = require('../app');

describe('Profile and Practice Logging API', () => {
  let db;
  let authToken;
  let userId;

  beforeAll(async () => {
    // Remove test database if it exists
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // Initialize database
    db = getDb();

    // Create tables
    await new Promise((resolve, reject) => {
      const createUsersTable = `
        CREATE TABLE Users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      const createPracticeLogsTable = `
        CREATE TABLE PracticeLogs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          duration_seconds INTEGER NOT NULL,
          practiced_at DATE NOT NULL,
          FOREIGN KEY (user_id) REFERENCES Users(id)
        )
      `;

      const createAttendanceTable = `
        CREATE TABLE Attendance (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          date DATE NOT NULL,
          FOREIGN KEY (user_id) REFERENCES Users(id),
          UNIQUE(user_id, date)
        )
      `;

      db.serialize(() => {
        db.run(createUsersTable);
        db.run(createPracticeLogsTable);
        db.run(createAttendanceTable, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });

    // Create test user and get auth token
    const registerResponse = await request(app)
      .post('/api/auth/signup')
      .send({
        username: 'practiceuser',
        password: 'password123'
      });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'practiceuser',
        password: 'password123'
      });

    authToken = loginResponse.body.token;
    userId = loginResponse.body.user.id;
  });

  afterAll(async () => {
    if (db) {
      await closeDb(db);
    }
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('POST /api/practice/log', () => {
    test('should log practice session successfully', async () => {
      const practiceData = {
        duration_seconds: 300, // 5 minutes
        practiced_at: '2025-09-21'
      };

      const response = await request(app)
        .post('/api/practice/log')
        .set('Authorization', `Bearer ${authToken}`)
        .send(practiceData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Practice session logged successfully');
      expect(response.body.practice_log).toMatchObject({
        user_id: userId,
        duration_seconds: 300,
        practiced_at: '2025-09-21'
      });
    });

    test('should require authentication', async () => {
      const practiceData = {
        duration_seconds: 300,
        practiced_at: '2025-09-21'
      };

      const response = await request(app)
        .post('/api/practice/log')
        .send(practiceData);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Access token required');
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/practice/log')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    test('should validate positive duration', async () => {
      const practiceData = {
        duration_seconds: -100,
        practiced_at: '2025-09-21'
      };

      const response = await request(app)
        .post('/api/practice/log')
        .set('Authorization', `Bearer ${authToken}`)
        .send(practiceData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Duration must be positive');
    });

    test('should auto-create attendance record', async () => {
      const practiceData = {
        duration_seconds: 600, // 10 minutes
        practiced_at: '2025-09-22'
      };

      const response = await request(app)
        .post('/api/practice/log')
        .set('Authorization', `Bearer ${authToken}`)
        .send(practiceData);

      expect(response.status).toBe(201);
      expect(response.body.attendance_created).toBe(true);
    });

    test('should not duplicate attendance for same date', async () => {
      // First practice session
      await request(app)
        .post('/api/practice/log')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          duration_seconds: 300,
          practiced_at: '2025-09-23'
        });

      // Second practice session same date
      const response = await request(app)
        .post('/api/practice/log')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          duration_seconds: 400,
          practiced_at: '2025-09-23'
        });

      expect(response.status).toBe(201);
      expect(response.body.attendance_created).toBe(false);
    });

    test('should handle invalid date format', async () => {
      const practiceData = {
        duration_seconds: 300,
        practiced_at: 'invalid-date'
      };

      const response = await request(app)
        .post('/api/practice/log')
        .set('Authorization', `Bearer ${authToken}`)
        .send(practiceData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid date format');
    });
  });

  describe('GET /api/profile/stats', () => {
    beforeEach(async () => {
      // Clear existing data
      const db = getDb();
      await new Promise((resolve) => {
        db.run('DELETE FROM PracticeLogs WHERE user_id = ?', [userId], () => {
          db.run('DELETE FROM Attendance WHERE user_id = ?', [userId], resolve);
        });
      });
    });

    test('should return user statistics successfully', async () => {
      // Add some practice data
      await request(app)
        .post('/api/practice/log')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          duration_seconds: 600, // 10 minutes
          practiced_at: '2025-09-20'
        });

      await request(app)
        .post('/api/practice/log')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          duration_seconds: 900, // 15 minutes
          practiced_at: '2025-09-21'
        });

      const response = await request(app)
        .get('/api/profile/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        total_practice_time: 1500, // 25 minutes in seconds
        total_attendance_days: 2,
        average_daily_practice: 750, // 1500 / 2
        stats_period: expect.any(String)
      });
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/profile/stats');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Access token required');
    });

    test('should return zero stats for new user', async () => {
      const response = await request(app)
        .get('/api/profile/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        total_practice_time: 0,
        total_attendance_days: 0,
        average_daily_practice: 0
      });
    });

    test('should calculate stats correctly with multiple sessions per day', async () => {
      // Add multiple sessions on same day
      await request(app)
        .post('/api/practice/log')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          duration_seconds: 300,
          practiced_at: '2025-09-21'
        });

      await request(app)
        .post('/api/practice/log')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          duration_seconds: 400,
          practiced_at: '2025-09-21'
        });

      await request(app)
        .post('/api/practice/log')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          duration_seconds: 500,
          practiced_at: '2025-09-22'
        });

      const response = await request(app)
        .get('/api/profile/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        total_practice_time: 1200, // 300 + 400 + 500
        total_attendance_days: 2, // 2 unique dates
        average_daily_practice: 600 // 1200 / 2
      });
    });

    test('should include additional stats details', async () => {
      // Add practice data spanning multiple days
      await request(app)
        .post('/api/practice/log')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          duration_seconds: 1800, // 30 minutes
          practiced_at: '2025-09-15'
        });

      await request(app)
        .post('/api/practice/log')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          duration_seconds: 1200, // 20 minutes
          practiced_at: '2025-09-21'
        });

      const response = await request(app)
        .get('/api/profile/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('first_practice_date');
      expect(response.body).toHaveProperty('last_practice_date');
      expect(response.body).toHaveProperty('longest_session');
      expect(response.body.longest_session).toBe(1800);
    });
  });
});