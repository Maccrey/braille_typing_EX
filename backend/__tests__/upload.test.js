const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../app');
const xlsx = require('xlsx');

describe('File Upload API', () => {
  let authToken;
  let testUserId;
  let db;
  const testDbPath = path.join(__dirname, '..', 'test-upload.db');

  // Helper function to create a valid Excel file buffer
  function createValidExcelBuffer() {
    const data = [
      ['α', '1', ''],
      ['β', '1,2', ''],
      ['γ', '1,2,4,5', ''],
      ['δ', '1,4,5', ''],
      ['ε', '1,5', '']
    ];

    const worksheet = xlsx.utils.aoa_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  // Helper function to create an empty Excel file buffer
  function createEmptyExcelBuffer() {
    const worksheet = xlsx.utils.aoa_to_sheet([]);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  // Helper function to create an Excel file with missing columns
  function createInvalidColumnsExcelBuffer() {
    const data = [
      ['α'], // Only one column
      ['β']
    ];

    const worksheet = xlsx.utils.aoa_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  // Helper function to create an Excel file with invalid braille patterns
  function createInvalidBrailleExcelBuffer() {
    const data = [
      ['α', '9,10'], // Invalid dot numbers
      ['β', 'invalid']
    ];

    const worksheet = xlsx.utils.aoa_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  beforeEach(async () => {
    // Remove test database if it exists
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // Create fresh test database
    const sqlite3 = require('sqlite3').verbose();
    db = new sqlite3.Database(testDbPath);

    // Create tables for testing
    await new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run(`
          CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        db.run(`
          CREATE TABLE categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(100) NOT NULL,
            description TEXT,
            is_public BOOLEAN DEFAULT 0,
            created_by INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users(id),
            UNIQUE(name, created_by)
          )
        `);

        db.run(`
          CREATE TABLE braille_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id INTEGER NOT NULL,
            character VARCHAR(10) NOT NULL,
            braille_pattern TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES categories(id)
          )
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });

    // Clear the require cache to force fresh module loading
    delete require.cache[require.resolve('../config/database')];
    delete require.cache[require.resolve('../controllers/authController')];

    // Override database path in the database module
    process.env.TEST_DB_PATH = testDbPath;

    // Create test user and get auth token
    const uniqueUsername = `uploaduser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const signupResponse = await request(app)
      .post('/api/auth/signup')
      .send({
        username: uniqueUsername,
        password: 'testpassword123'
      });

    expect(signupResponse.status).toBe(201);
    testUserId = signupResponse.body.userId;

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: uniqueUsername,
        password: 'testpassword123'
      });

    expect(loginResponse.status).toBe(200);
    authToken = loginResponse.body.token;
  });

  afterEach(async () => {
    // Clean up environment
    delete process.env.TEST_DB_PATH;

    if (db) {
      await new Promise((resolve) => {
        db.close(resolve);
      });
    }

    // Remove test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // Clear require cache
    delete require.cache[require.resolve('../config/database')];
    delete require.cache[require.resolve('../controllers/authController')];
  });

  describe('POST /api/protected/upload', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/protected/upload')
        .attach('file', Buffer.from('test'), 'test.xlsx')
        .field('categoryName', 'Test Category')
        .field('description', 'Test Description');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Access token required');
    });

    test('should require file upload', async () => {
      const response = await request(app)
        .post('/api/protected/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('categoryName', 'Test Category')
        .field('description', 'Test Description');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('No file uploaded');
    });

    test('should require category name', async () => {
      const response = await request(app)
        .post('/api/protected/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('test'), 'test.xlsx')
        .field('description', 'Test Description');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Category name is required');
    });

    test('should only accept Excel files', async () => {
      const response = await request(app)
        .post('/api/protected/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('test'), 'test.txt')
        .field('categoryName', 'Test Category')
        .field('description', 'Test Description');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Only Excel files (.xlsx, .xls) are allowed');
    });

    test('should handle duplicate category names from same user', async () => {
      const validExcelBuffer = createValidExcelBuffer();

      // Create initial category
      await request(app)
        .post('/api/protected/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', validExcelBuffer, 'test1.xlsx')
        .field('categoryName', 'Duplicate Category')
        .field('description', 'First upload');

      // Try to create duplicate
      const response = await request(app)
        .post('/api/protected/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', validExcelBuffer, 'test2.xlsx')
        .field('categoryName', 'Duplicate Category')
        .field('description', 'Second upload');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Category name already exists for this user');
    });

    test('should allow same category name from different users', async () => {
      // Create second user
      const uniqueUsername2 = `uploaduser2_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const signup2Response = await request(app)
        .post('/api/auth/signup')
        .send({
          username: uniqueUsername2,
          password: 'testpassword123'
        });

      const login2Response = await request(app)
        .post('/api/auth/login')
        .send({
          username: uniqueUsername2,
          password: 'testpassword123'
        });

      const authToken2 = login2Response.body.token;

      const validExcelBuffer = createValidExcelBuffer();

      // First user uploads
      const response1 = await request(app)
        .post('/api/protected/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', validExcelBuffer, 'test1.xlsx')
        .field('categoryName', 'Same Category Name')
        .field('description', 'First user upload');

      expect(response1.status).toBe(201);

      // Second user uploads with same category name
      const response2 = await request(app)
        .post('/api/protected/upload')
        .set('Authorization', `Bearer ${authToken2}`)
        .attach('file', validExcelBuffer, 'test2.xlsx')
        .field('categoryName', 'Same Category Name')
        .field('description', 'Second user upload');

      expect(response2.status).toBe(201);
      expect(response2.body.message).toBe('File uploaded and processed successfully');
    });

    test('should handle malformed Excel files', async () => {
      const response = await request(app)
        .post('/api/protected/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('invalid excel content'), 'invalid.xlsx')
        .field('categoryName', 'Test Category')
        .field('description', 'Test Description');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid Excel file format');
    });

    test('should handle empty Excel files', async () => {
      const response = await request(app)
        .post('/api/protected/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(''), 'empty.xlsx')
        .field('categoryName', 'Test Category')
        .field('description', 'Test Description');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('File is empty or invalid');
    });

    test('should create public category when isPublic is true', async () => {
      const validExcelBuffer = createValidExcelBuffer();
      const response = await request(app)
        .post('/api/protected/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', validExcelBuffer, 'test.xlsx')
        .field('categoryName', 'Public Category')
        .field('description', 'Test Description')
        .field('isPublic', 'true');

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('File uploaded and processed successfully');
      expect(response.body.category.is_public).toBe(1);
    });

    test('should create private category by default', async () => {
      const validExcelBuffer = createValidExcelBuffer();
      const response = await request(app)
        .post('/api/protected/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', validExcelBuffer, 'test.xlsx')
        .field('categoryName', 'Private Category')
        .field('description', 'Test Description');

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('File uploaded and processed successfully');
      expect(response.body.category.is_public).toBe(0);
    });

    test('should parse Excel file and create braille data entries', async () => {
      const validExcelBuffer = createValidExcelBuffer();
      const response = await request(app)
        .post('/api/protected/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', validExcelBuffer, 'test.xlsx')
        .field('categoryName', 'Braille Category')
        .field('description', 'Test braille data');

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('File uploaded and processed successfully');
      expect(response.body.category).toBeDefined();
      expect(response.body.category.name).toBe('Braille Category');
      expect(response.body.category.description).toBe('Test braille data');
      expect(response.body.category.created_by).toBe(testUserId);
      expect(response.body.brailleDataCount).toBeGreaterThan(0);
    });

    test('should handle Excel files with missing data columns', async () => {
      const invalidColumnsBuffer = createInvalidColumnsExcelBuffer();
      const response = await request(app)
        .post('/api/protected/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', invalidColumnsBuffer, 'missing_cols.xlsx')
        .field('categoryName', 'Test Category')
        .field('description', 'Test Description');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Excel file must have at least 2 columns (character and braille pattern)');
    });

    test('should validate braille pattern format', async () => {
      const invalidBrailleBuffer = createInvalidBrailleExcelBuffer();
      const response = await request(app)
        .post('/api/protected/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', invalidBrailleBuffer, 'invalid_patterns.xlsx')
        .field('categoryName', 'Test Category')
        .field('description', 'Test Description');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid braille pattern');
    });

    test('should return correct response structure on successful upload', async () => {
      const validExcelBuffer = createValidExcelBuffer();
      const response = await request(app)
        .post('/api/protected/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', validExcelBuffer, 'valid.xlsx')
        .field('categoryName', 'Complete Category')
        .field('description', 'Complete test')
        .field('isPublic', 'false');

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'File uploaded and processed successfully');
      expect(response.body).toHaveProperty('category');
      expect(response.body).toHaveProperty('brailleDataCount');
      expect(response.body.category).toHaveProperty('id');
      expect(response.body.category).toHaveProperty('name', 'Complete Category');
      expect(response.body.category).toHaveProperty('description', 'Complete test');
      expect(response.body.category).toHaveProperty('is_public', 0);
      expect(response.body.category).toHaveProperty('created_by', testUserId);
      expect(response.body.category).toHaveProperty('created_at');
    });

    test('should handle very large category names', async () => {
      const longName = 'a'.repeat(150); // Longer than 100 character limit
      const validExcelBuffer = createValidExcelBuffer();

      const response = await request(app)
        .post('/api/protected/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', validExcelBuffer, 'test.xlsx')
        .field('categoryName', longName)
        .field('description', 'Test Description');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Category name must be 100 characters or less');
    });

    test('should handle very long descriptions gracefully', async () => {
      const longDescription = 'a'.repeat(1000);
      const validExcelBuffer = createValidExcelBuffer();

      const response = await request(app)
        .post('/api/protected/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', validExcelBuffer, 'test.xlsx')
        .field('categoryName', 'Test Category')
        .field('description', longDescription);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('File uploaded and processed successfully');
    });
  });
});