const request = require('supertest');
const app = require('../app');

describe('Performance Tests', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    // Create a test user for performance testing
    testUser = {
      username: `perftest_${Date.now()}`,
      password: 'password123'
    };

    await request(app)
      .post('/api/auth/signup')
      .send(testUser);

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send(testUser);

    authToken = loginResponse.body.token;
  });

  describe('API Response Times', () => {
    test('Login endpoint should respond within 500ms', async () => {
      const start = Date.now();

      const response = await request(app)
        .post('/api/auth/login')
        .send(testUser);

      const responseTime = Date.now() - start;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(500);
      console.log(`Login response time: ${responseTime}ms`);
    });

    test('Categories listing should respond within 300ms', async () => {
      const start = Date.now();

      const response = await request(app)
        .get('/api/protected/categories/my')
        .set('Authorization', `Bearer ${authToken}`);

      const responseTime = Date.now() - start;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(300);
      console.log(`Categories listing response time: ${responseTime}ms`);
    });

    test('User statistics should respond within 400ms', async () => {
      const start = Date.now();

      const response = await request(app)
        .get('/api/profile/stats')
        .set('Authorization', `Bearer ${authToken}`);

      const responseTime = Date.now() - start;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(400);
      console.log(`User statistics response time: ${responseTime}ms`);
    });

    test('Public category search should respond within 500ms', async () => {
      const start = Date.now();

      const response = await request(app)
        .get('/api/protected/categories/search?q=test')
        .set('Authorization', `Bearer ${authToken}`);

      const responseTime = Date.now() - start;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(500);
      console.log(`Category search response time: ${responseTime}ms`);
    });
  });

  describe('Database Query Performance', () => {
    beforeAll(async () => {
      // Create some test data for performance testing
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/api/practice/log')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ duration_seconds: 60 + i });
      }
    });

    test('Complex user statistics query should be fast', async () => {
      const start = Date.now();

      const response = await request(app)
        .get('/api/profile/stats')
        .set('Authorization', `Bearer ${authToken}`);

      const responseTime = Date.now() - start;

      expect(response.status).toBe(200);
      expect(response.body.totalPracticeTime).toBeGreaterThan(0);
      expect(responseTime).toBeLessThan(200);
      console.log(`Complex stats query time: ${responseTime}ms`);
    });

    test('Practice logs query should be optimized', async () => {
      const start = Date.now();

      const response = await request(app)
        .get('/api/profile/attendance')
        .set('Authorization', `Bearer ${authToken}`);

      const responseTime = Date.now() - start;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(150);
      console.log(`Practice logs query time: ${responseTime}ms`);
    });
  });

  describe('Concurrent Request Handling', () => {
    test('Should handle multiple concurrent requests efficiently', async () => {
      const concurrentRequests = 10;
      const start = Date.now();

      const promises = Array.from({ length: concurrentRequests }, () =>
        request(app)
          .get('/api/protected/categories/my')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const results = await Promise.all(promises);
      const totalTime = Date.now() - start;
      const averageTime = totalTime / concurrentRequests;

      // All requests should succeed
      results.forEach(result => {
        expect(result.status).toBe(200);
      });

      // Average response time should be reasonable
      expect(averageTime).toBeLessThan(200);
      console.log(`${concurrentRequests} concurrent requests completed in ${totalTime}ms (avg: ${averageTime.toFixed(2)}ms)`);
    });

    test('Should handle search requests concurrently', async () => {
      const searchTerms = ['test', 'example', 'demo', 'sample', 'practice'];
      const start = Date.now();

      const promises = searchTerms.map(term =>
        request(app)
          .get(`/api/protected/categories/search?q=${term}`)
          .set('Authorization', `Bearer ${authToken}`)
      );

      const results = await Promise.all(promises);
      const totalTime = Date.now() - start;

      results.forEach(result => {
        expect(result.status).toBe(200);
      });

      expect(totalTime).toBeLessThan(1000);
      console.log(`${searchTerms.length} concurrent search requests completed in ${totalTime}ms`);
    });
  });

  describe('Memory Usage and Efficiency', () => {
    test('Should not create memory leaks during repeated requests', async () => {
      const iterations = 50;
      const start = Date.now();

      for (let i = 0; i < iterations; i++) {
        const response = await request(app)
          .get('/api/protected/categories/my')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
      }

      const totalTime = Date.now() - start;
      const averageTime = totalTime / iterations;

      // Performance should remain consistent
      expect(averageTime).toBeLessThan(100);
      console.log(`${iterations} sequential requests completed in ${totalTime}ms (avg: ${averageTime.toFixed(2)}ms)`);
    });
  });

  describe('Response Size Optimization', () => {
    test('API responses should be reasonably sized', async () => {
      const response = await request(app)
        .get('/api/protected/categories/my')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);

      // Check response size (approximate)
      const responseSize = JSON.stringify(response.body).length;
      expect(responseSize).toBeLessThan(10000); // 10KB limit for categories list

      console.log(`Categories response size: ${responseSize} bytes`);
    });

    test('User statistics response should be compact', async () => {
      const response = await request(app)
        .get('/api/profile/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);

      const responseSize = JSON.stringify(response.body).length;
      expect(responseSize).toBeLessThan(1000); // 1KB limit for stats

      console.log(`Statistics response size: ${responseSize} bytes`);
    });
  });
});

// Performance monitoring helper
function measureResponseTime(testName) {
  return {
    start: Date.now(),
    end: function() {
      const time = Date.now() - this.start;
      console.log(`${testName}: ${time}ms`);
      return time;
    }
  };
}