const request = require('supertest');
const app = require('../app');

describe('Basic App Tests', () => {
  test('GET / should return API running message', async () => {
    const response = await request(app)
      .get('/')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.message).toBe('Braille Typing Practice API is running');
  });

  test('GET /api/health should return health status', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.status).toBe('ok');
    expect(response.body.timestamp).toBeDefined();
  });

  test('GET /nonexistent should return 404', async () => {
    const response = await request(app)
      .get('/nonexistent')
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body.error).toBe('Route not found');
  });
});