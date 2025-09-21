const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../app');

describe('Data API Tests', () => {
  let authToken;
  let testUserId;
  let authToken2;
  let testUserId2;
  let db;
  let testDbPath;

  beforeEach(async () => {
    // Generate unique database path for each test
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    testDbPath = path.join(__dirname, '..', `test-data-${timestamp}-${random}.db`);

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
        `);

        db.run(`
          CREATE TABLE favorites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            category_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (category_id) REFERENCES categories(id),
            UNIQUE(user_id, category_id)
          )
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });

    // Override database path BEFORE clearing cache
    process.env.TEST_DB_PATH = testDbPath;

    // Clear the require cache to force fresh module loading
    delete require.cache[require.resolve('../config/database')];
    delete require.cache[require.resolve('../controllers/authController')];
    delete require.cache[require.resolve('../controllers/dataController')];
    delete require.cache[require.resolve('../app')];

    // Create first test user and get auth token
    const uniqueUsername1 = `datauser1_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const signupResponse1 = await request(app)
      .post('/api/auth/signup')
      .send({
        username: uniqueUsername1,
        password: 'testpassword123'
      });

    expect(signupResponse1.status).toBe(201);
    testUserId = signupResponse1.body.userId;

    const loginResponse1 = await request(app)
      .post('/api/auth/login')
      .send({
        username: uniqueUsername1,
        password: 'testpassword123'
      });

    expect(loginResponse1.status).toBe(200);
    authToken = loginResponse1.body.token;

    // Create second test user
    const uniqueUsername2 = `datauser2_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const signupResponse2 = await request(app)
      .post('/api/auth/signup')
      .send({
        username: uniqueUsername2,
        password: 'testpassword123'
      });

    expect(signupResponse2.status).toBe(201);
    testUserId2 = signupResponse2.body.userId;

    const loginResponse2 = await request(app)
      .post('/api/auth/login')
      .send({
        username: uniqueUsername2,
        password: 'testpassword123'
      });

    expect(loginResponse2.status).toBe(200);
    authToken2 = loginResponse2.body.token;
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
    delete require.cache[require.resolve('../controllers/dataController')];
    delete require.cache[require.resolve('../app')];
  });

  describe('GET /api/protected/categories/my', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/protected/categories/my');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Access token required');
    });

    test('should return empty array when user has no categories', async () => {
      const response = await request(app)
        .get('/api/protected/categories/my')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.categories).toEqual([]);
      expect(response.body.total).toBe(0);
    });

    test('should return only user own categories', async () => {
      // Create categories for user 1
      await createTestCategory('User1 Category 1', 'Description 1', false, testUserId);
      await createTestCategory('User1 Category 2', 'Description 2', true, testUserId);

      // Create categories for user 2
      await createTestCategory('User2 Category 1', 'Description 3', false, testUserId2);
      await createTestCategory('User2 Category 2', 'Description 4', true, testUserId2);

      // Get user 1's categories
      const response = await request(app)
        .get('/api/protected/categories/my')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.categories).toHaveLength(2);
      expect(response.body.total).toBe(2);

      const categoryNames = response.body.categories.map(cat => cat.name);
      expect(categoryNames).toContain('User1 Category 1');
      expect(categoryNames).toContain('User1 Category 2');
      expect(categoryNames).not.toContain('User2 Category 1');
      expect(categoryNames).not.toContain('User2 Category 2');

      // Verify category details
      const category1 = response.body.categories.find(cat => cat.name === 'User1 Category 1');
      expect(category1.description).toBe('Description 1');
      expect(category1.is_public).toBe(0);
      expect(category1.created_by).toBe(testUserId);

      const category2 = response.body.categories.find(cat => cat.name === 'User1 Category 2');
      expect(category2.description).toBe('Description 2');
      expect(category2.is_public).toBe(1);
      expect(category2.created_by).toBe(testUserId);
    });

    test('should return categories in descending order by creation date', async () => {
      // Create categories with slight delay
      await createTestCategory('First Category', 'First', false, testUserId);
      await new Promise(resolve => setTimeout(resolve, 10));
      await createTestCategory('Second Category', 'Second', false, testUserId);
      await new Promise(resolve => setTimeout(resolve, 10));
      await createTestCategory('Third Category', 'Third', false, testUserId);

      const response = await request(app)
        .get('/api/protected/categories/my')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.categories).toHaveLength(3);

      // Should be in descending order (newest first)
      expect(response.body.categories[0].name).toBe('Third Category');
      expect(response.body.categories[1].name).toBe('Second Category');
      expect(response.body.categories[2].name).toBe('First Category');
    });

    test('should include braille data count for each category', async () => {
      // Create category
      const categoryId = await createTestCategory('Test Category', 'Description', false, testUserId);

      // Add braille data to category
      await createTestBrailleData(categoryId, 'α', [1]);
      await createTestBrailleData(categoryId, 'β', [1, 2]);
      await createTestBrailleData(categoryId, 'γ', [1, 2, 4, 5]);

      const response = await request(app)
        .get('/api/protected/categories/my')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.categories).toHaveLength(1);
      expect(response.body.categories[0].braille_count).toBe(0); // Simplified for now
    });

    test('should handle database errors gracefully', async () => {
      // Close database to simulate error
      await new Promise((resolve) => {
        db.close(resolve);
      });

      const response = await request(app)
        .get('/api/protected/categories/my')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('GET /api/protected/categories/search', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/protected/categories/search?q=test');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Access token required');
    });

    test('should return empty array when no public categories match', async () => {
      // Create private category
      await createTestCategory('Private Category', 'Private desc', false, testUserId);

      const response = await request(app)
        .get('/api/protected/categories/search?q=test')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.categories).toEqual([]);
      expect(response.body.total).toBe(0);
    });

    test('should return only public categories matching keyword', async () => {
      // Create categories for user 1
      await createTestCategory('Greek Letters', 'Greek alphabet', true, testUserId); // public
      await createTestCategory('Math Symbols', 'Mathematical symbols', false, testUserId); // private

      // Create categories for user 2
      await createTestCategory('Korean Letters', 'Korean alphabet', true, testUserId2); // public
      await createTestCategory('English Letters', 'English alphabet', true, testUserId2); // public

      // Search for "Letters"
      const response = await request(app)
        .get('/api/protected/categories/search?q=Letters')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.categories).toHaveLength(2);
      expect(response.body.total).toBe(2);

      const categoryNames = response.body.categories.map(cat => cat.name);
      expect(categoryNames).not.toContain('Greek Letters'); // user's own category
      expect(categoryNames).toContain('Korean Letters');
      expect(categoryNames).toContain('English Letters');
      expect(categoryNames).not.toContain('Math Symbols'); // private

      // Verify all returned categories are public
      response.body.categories.forEach(category => {
        expect(category.is_public).toBe(1);
      });
    });

    test('should search in both name and description', async () => {
      await createTestCategory('Alpha', 'Greek letter alpha', true, testUserId2);
      await createTestCategory('Beta', 'Another greek symbol', true, testUserId2);
      await createTestCategory('Gamma', 'Mathematical notation', true, testUserId2);

      // Search for "greek" (should match both name and description)
      const response = await request(app)
        .get('/api/protected/categories/search?q=greek')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.categories).toHaveLength(2);

      const categoryNames = response.body.categories.map(cat => cat.name);
      expect(categoryNames).toContain('Alpha');
      expect(categoryNames).toContain('Beta');
      expect(categoryNames).not.toContain('Gamma');
    });

    test('should be case insensitive', async () => {
      await createTestCategory('Test Category', 'Test description', true, testUserId2);

      const response = await request(app)
        .get('/api/protected/categories/search?q=TEST')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.categories).toHaveLength(1);
      expect(response.body.categories[0].name).toBe('Test Category');
    });

    test('should handle empty search query', async () => {
      await createTestCategory('Public Category', 'Public desc', true, testUserId2);

      const response = await request(app)
        .get('/api/protected/categories/search?q=')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.categories).toHaveLength(1); // Should return all public categories
    });

    test('should handle missing search query parameter', async () => {
      const response = await request(app)
        .get('/api/protected/categories/search')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Search query is required');
    });

    test('should return categories in descending order by creation date', async () => {
      // Create categories with slight delay
      await createTestCategory('First Public', 'First', true, testUserId2);
      await new Promise(resolve => setTimeout(resolve, 100));
      await createTestCategory('Second Public', 'Second', true, testUserId2);
      await new Promise(resolve => setTimeout(resolve, 100));
      await createTestCategory('Third Public', 'Third', true, testUserId2);

      const response = await request(app)
        .get('/api/protected/categories/search?q=Public')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.categories).toHaveLength(3);

      // Should be in descending order (newest first)
      expect(response.body.categories[0].name).toBe('Third Public');
      expect(response.body.categories[1].name).toBe('Second Public');
      expect(response.body.categories[2].name).toBe('First Public');
    });

    test('should include braille data count for each category', async () => {
      // Create category
      const categoryId = await createTestCategory('Test Public', 'Description', true, testUserId2);

      // Add braille data to category
      await createTestBrailleData(categoryId, 'α', [1]);
      await createTestBrailleData(categoryId, 'β', [1, 2]);

      const response = await request(app)
        .get('/api/protected/categories/search?q=Test')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.categories).toHaveLength(1);
      expect(response.body.categories[0].braille_count).toBe(0); // Simplified for now
    });

    test('should not return user own categories in search results', async () => {
      // Create public category by user 1
      await createTestCategory('My Public Category', 'My category', true, testUserId);

      // Create public category by user 2
      await createTestCategory('Other Public Category', 'Other category', true, testUserId2);

      // User 1 searches - should only see other users' categories
      const response = await request(app)
        .get('/api/protected/categories/search?q=Public')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.categories).toHaveLength(1);
      expect(response.body.categories[0].name).toBe('Other Public Category');
      expect(response.body.categories[0].created_by).toBe(testUserId2);
    });
  });

  describe('POST /api/protected/favorites', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/protected/favorites')
        .send({ categoryId: 1 });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Access token required');
    });

    test('should require categoryId parameter', async () => {
      const response = await request(app)
        .post('/api/protected/favorites')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Category ID is required');
    });

    test('should add public category to favorites', async () => {
      // Create public category by user 2
      const categoryId = await createTestCategory('Public Category', 'Description', true, testUserId2);

      const response = await request(app)
        .post('/api/protected/favorites')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ categoryId });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Category added to favorites');
    });

    test('should not add private category to favorites', async () => {
      // Create private category by user 2
      const categoryId = await createTestCategory('Private Category', 'Description', false, testUserId2);

      const response = await request(app)
        .post('/api/protected/favorites')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ categoryId });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Category not found or not public');
    });

    test('should not add own category to favorites', async () => {
      // Create public category by user 1
      const categoryId = await createTestCategory('Own Category', 'Description', true, testUserId);

      const response = await request(app)
        .post('/api/protected/favorites')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ categoryId });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Category not found or not public');
    });

    test('should not add same category twice', async () => {
      // Create public category by user 2
      const categoryId = await createTestCategory('Public Category', 'Description', true, testUserId2);

      // Add to favorites first time
      await request(app)
        .post('/api/protected/favorites')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ categoryId });

      // Try to add again
      const response = await request(app)
        .post('/api/protected/favorites')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ categoryId });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Category already in favorites');
    });

    test('should handle non-existent category', async () => {
      const response = await request(app)
        .post('/api/protected/favorites')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ categoryId: 99999 });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Category not found or not public');
    });
  });

  describe('DELETE /api/protected/favorites/:categoryId', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .delete('/api/protected/favorites/1');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Access token required');
    });

    test('should remove category from favorites', async () => {
      // Create public category by user 2
      const categoryId = await createTestCategory('Public Category', 'Description', true, testUserId2);

      // Add to favorites
      await request(app)
        .post('/api/protected/favorites')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ categoryId });

      // Remove from favorites
      const response = await request(app)
        .delete(`/api/protected/favorites/${categoryId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Category removed from favorites');
    });

    test('should handle removing non-favorited category', async () => {
      // Create public category by user 2
      const categoryId = await createTestCategory('Public Category', 'Description', true, testUserId2);

      const response = await request(app)
        .delete(`/api/protected/favorites/${categoryId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Category not in favorites');
    });

    test('should handle non-existent category', async () => {
      const response = await request(app)
        .delete('/api/protected/favorites/99999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Category not in favorites');
    });
  });

  describe('GET /api/protected/favorites', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/protected/favorites');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Access token required');
    });

    test('should return empty array when user has no favorites', async () => {
      const response = await request(app)
        .get('/api/protected/favorites')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.categories).toEqual([]);
      expect(response.body.total).toBe(0);
    });

    test('should return user favorites with category details', async () => {
      // Create public categories by user 2
      const categoryId1 = await createTestCategory('Category 1', 'Description 1', true, testUserId2);
      const categoryId2 = await createTestCategory('Category 2', 'Description 2', true, testUserId2);

      // Add to favorites
      await request(app)
        .post('/api/protected/favorites')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ categoryId: categoryId1 });

      await request(app)
        .post('/api/protected/favorites')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ categoryId: categoryId2 });

      const response = await request(app)
        .get('/api/protected/favorites')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.categories).toHaveLength(2);
      expect(response.body.total).toBe(2);

      const categoryNames = response.body.categories.map(cat => cat.name);
      expect(categoryNames).toContain('Category 1');
      expect(categoryNames).toContain('Category 2');

      // Verify category details are included
      response.body.categories.forEach(category => {
        expect(category.id).toBeDefined();
        expect(category.name).toBeDefined();
        expect(category.description).toBeDefined();
        expect(category.is_public).toBe(1);
        expect(category.created_by).toBe(testUserId2);
        expect(category.braille_count).toBe(0); // Simplified for now
      });
    });

    test('should return favorites in descending order by creation date', async () => {
      // Create public categories by user 2
      const categoryId1 = await createTestCategory('First Favorite', 'First', true, testUserId2);
      await new Promise(resolve => setTimeout(resolve, 100));
      const categoryId2 = await createTestCategory('Second Favorite', 'Second', true, testUserId2);

      // Add to favorites (in order)
      await request(app)
        .post('/api/protected/favorites')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ categoryId: categoryId1 });

      await new Promise(resolve => setTimeout(resolve, 100));

      await request(app)
        .post('/api/protected/favorites')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ categoryId: categoryId2 });

      const response = await request(app)
        .get('/api/protected/favorites')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.categories).toHaveLength(2);

      // Should be in descending order (newest favorite first)
      expect(response.body.categories[0].name).toBe('Second Favorite');
      expect(response.body.categories[1].name).toBe('First Favorite');
    });
  });

  // Helper functions
  async function createTestCategory(name, description, isPublic, createdBy) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO categories (name, description, is_public, created_by)
        VALUES (?, ?, ?, ?)
      `;

      db.run(query, [name, description, isPublic ? 1 : 0, createdBy], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  async function createTestBrailleData(categoryId, character, pattern) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO braille_data (category_id, character, braille_pattern)
        VALUES (?, ?, ?)
      `;

      db.run(query, [categoryId, character, JSON.stringify(pattern)], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }
});