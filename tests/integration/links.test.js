// tests/links.test.js
import request from 'supertest';
import app from '../server.js';
import Link from '../models/Link.js';
import { createTestUser, generateAuthToken } from './helpers.js';

describe('Links API', () => {
  let token;
  let user;

  beforeEach(async () => {
    user = await createTestUser();
    token = generateAuthToken(user);
  });

  test('should create a new link', async () => {
    const res = await request(app)
      .post('/api/links')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Test Link',
        url: 'https://example.com'
      });

    expect(res.status).toBe(201);
    expect(res.body.link.title).toBe('Test Link');
  });
});