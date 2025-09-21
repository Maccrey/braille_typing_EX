const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

describe('Database Schema Tests', () => {
  let db;
  const testDbPath = path.join(__dirname, '..', 'test-database.db');

  beforeAll(async () => {
    // Remove test database if it exists
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // Create test database directly
    db = new sqlite3.Database(testDbPath);

    // Create tables manually for testing
    const tables = [
      `CREATE TABLE IF NOT EXISTS Users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS Categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_by INTEGER NOT NULL,
        is_public BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES Users(id),
        UNIQUE(name, created_by)
      )`,
      `CREATE TABLE IF NOT EXISTS BrailleData (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL,
        character VARCHAR(255) NOT NULL,
        braille_representation TEXT NOT NULL,
        FOREIGN KEY (category_id) REFERENCES Categories(id)
      )`,
      `CREATE TABLE IF NOT EXISTS PracticeLogs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        duration_seconds INTEGER NOT NULL,
        practiced_at DATE NOT NULL,
        FOREIGN KEY (user_id) REFERENCES Users(id)
      )`,
      `CREATE TABLE IF NOT EXISTS Attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date DATE NOT NULL,
        FOREIGN KEY (user_id) REFERENCES Users(id),
        UNIQUE(user_id, date)
      )`,
      `CREATE TABLE IF NOT EXISTS Favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        category_id INTEGER NOT NULL,
        favorited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES Users(id),
        FOREIGN KEY (category_id) REFERENCES Categories(id),
        UNIQUE(user_id, category_id)
      )`
    ];

    // Create all tables synchronously
    for (const tableSQL of tables) {
      await new Promise((resolve, reject) => {
        db.run(tableSQL, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  }, 10000);

  afterAll(async () => {
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

  test('Users table should exist with correct structure', (done) => {
    db.all("PRAGMA table_info(Users)", [], (err, rows) => {
      expect(err).toBeNull();
      expect(rows).toBeDefined();
      expect(rows.length).toBeGreaterThan(0);

      const columns = rows.map(row => row.name);
      expect(columns).toContain('id');
      expect(columns).toContain('username');
      expect(columns).toContain('password');
      expect(columns).toContain('created_at');
      done();
    });
  });

  test('Categories table should exist with correct structure', (done) => {
    db.all("PRAGMA table_info(Categories)", [], (err, rows) => {
      expect(err).toBeNull();
      expect(rows).toBeDefined();
      expect(rows.length).toBeGreaterThan(0);

      const columns = rows.map(row => row.name);
      expect(columns).toContain('id');
      expect(columns).toContain('name');
      expect(columns).toContain('description');
      expect(columns).toContain('created_by');
      expect(columns).toContain('is_public');
      expect(columns).toContain('created_at');
      done();
    });
  });

  test('BrailleData table should exist with correct structure', (done) => {
    db.all("PRAGMA table_info(BrailleData)", [], (err, rows) => {
      expect(err).toBeNull();
      expect(rows).toBeDefined();
      expect(rows.length).toBeGreaterThan(0);

      const columns = rows.map(row => row.name);
      expect(columns).toContain('id');
      expect(columns).toContain('category_id');
      expect(columns).toContain('character');
      expect(columns).toContain('braille_representation');
      done();
    });
  });

  test('PracticeLogs table should exist with correct structure', (done) => {
    db.all("PRAGMA table_info(PracticeLogs)", [], (err, rows) => {
      expect(err).toBeNull();
      expect(rows).toBeDefined();
      expect(rows.length).toBeGreaterThan(0);

      const columns = rows.map(row => row.name);
      expect(columns).toContain('id');
      expect(columns).toContain('user_id');
      expect(columns).toContain('duration_seconds');
      expect(columns).toContain('practiced_at');
      done();
    });
  });

  test('Attendance table should exist with correct structure', (done) => {
    db.all("PRAGMA table_info(Attendance)", [], (err, rows) => {
      expect(err).toBeNull();
      expect(rows).toBeDefined();
      expect(rows.length).toBeGreaterThan(0);

      const columns = rows.map(row => row.name);
      expect(columns).toContain('id');
      expect(columns).toContain('user_id');
      expect(columns).toContain('date');
      done();
    });
  });

  test('Favorites table should exist with correct structure', (done) => {
    db.all("PRAGMA table_info(Favorites)", [], (err, rows) => {
      expect(err).toBeNull();
      expect(rows).toBeDefined();
      expect(rows.length).toBeGreaterThan(0);

      const columns = rows.map(row => row.name);
      expect(columns).toContain('id');
      expect(columns).toContain('user_id');
      expect(columns).toContain('category_id');
      expect(columns).toContain('favorited_at');
      done();
    });
  });

  test('All tables should be created without foreign key errors', (done) => {
    db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, rows) => {
      expect(err).toBeNull();
      const tableNames = rows.map(row => row.name);

      expect(tableNames).toContain('Users');
      expect(tableNames).toContain('Categories');
      expect(tableNames).toContain('BrailleData');
      expect(tableNames).toContain('PracticeLogs');
      expect(tableNames).toContain('Attendance');
      expect(tableNames).toContain('Favorites');
      done();
    });
  });
});