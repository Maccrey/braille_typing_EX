const request = require('supertest');
const app = require('../app');

describe('Error Handling Tests', () => {
  // Use existing database setup from other tests

  describe('Input Validation', () => {
    test('should return validation error for empty username in signup', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          username: '',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('입력 데이터가 유효하지 않습니다');
      expect(response.body.details).toContain('사용자명은 필수입니다.');
    });

    test('should return validation error for short password', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'testuser',
          password: '123'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.details).toContain('비밀번호는 6글자 이상이어야 합니다.');
    });

    test('should return validation error for invalid username characters', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'user@invalid!',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.details).toContain('한글, 영문, 숫자, _, - 만 사용할 수 있습니다');
    });

    test('should return validation error for missing login fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('로그인 정보를 확인해주세요');
    });
  });

  describe('API Error Responses', () => {
    test('should return 404 for non-existent route', async () => {
      const response = await request(app)
        .get('/api/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('요청하신 경로를 찾을 수 없습니다');
      expect(response.body.path).toBe('/api/nonexistent');
      expect(response.body.timestamp).toBeDefined();
    });

    test('should return proper error for duplicate username', async () => {
      // First create a user
      const username = `testuser_${Date.now()}`;
      await request(app)
        .post('/api/auth/signup')
        .send({
          username,
          password: 'password123'
        });

      // Try to create same user again
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          username,
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('이미 존재하는');
    });

    test('should return proper error for invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistentuser',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Protected Route Error Handling', () => {
    test('should return 401 for missing authentication token', async () => {
      const response = await request(app)
        .get('/api/protected/categories/my');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    test('should return 401 for invalid authentication token', async () => {
      const response = await request(app)
        .get('/api/protected/categories/my')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('File Upload Error Handling', () => {
    let authToken;

    beforeAll(async () => {
      // Create a test user and get auth token
      const username = `testuser_upload_${Date.now()}`;
      const signupResponse = await request(app)
        .post('/api/auth/signup')
        .send({
          username,
          password: 'password123'
        });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username,
          password: 'password123'
        });

      authToken = loginResponse.body.token;
    });

    test('should return validation error for missing category name', async () => {
      const response = await request(app)
        .post('/api/protected/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('description', 'Test description')
        .attach('file', Buffer.from('test,data'), 'test.csv');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('업로드 데이터가 유효하지 않습니다');
      expect(response.body.details).toContain('카테고리 이름은 필수입니다');
    });

    test('should return validation error for missing file', async () => {
      const response = await request(app)
        .post('/api/protected/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('categoryName', 'Test Category')
        .field('description', 'Test description');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.details).toContain('업로드할 파일을 선택해주세요');
    });
  });

  describe('Rate Limiting and Security', () => {
    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}');

      expect(response.status).toBe(400);
    });

    test('should handle very large request body', async () => {
      const largeData = {
        username: 'a'.repeat(1000),
        password: 'b'.repeat(1000)
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(largeData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});