// tests/auth.test.js
import request from 'supertest';
import app from '../server.js';
import User from '../models/User.js';

describe('Authentication', () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });

  test('should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe('test@example.com');
  });
});