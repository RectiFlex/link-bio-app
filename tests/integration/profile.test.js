// tests/integration/profile.test.js

import request from 'supertest';
import mongoose from 'mongoose';
import { promises as fs } from 'fs';
import path from 'path';
import app from '../../src/server.js';
import User from '../../src/models/User.js';
import { createTestUser, generateAuthToken } from '../helpers.js';

describe('Profile API Endpoints', () => {
  let user;
  let token;
  
  beforeEach(async () => {
    // Create test user before each test
    user = await createTestUser({
      email: 'test@example.com',
      password: 'password123',
      profile: {
        name: 'Test User',
        bio: 'Original bio',
        theme: 'purple'
      }
    });
    token = generateAuthToken(user);
  });

  afterEach(async () => {
    // Clean up database after each test
    await User.deleteMany({});
  });

  describe('GET /api/profile', () => {
    it('should get user profile', async () => {
      const res = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.profile).toMatchObject({
        name: 'Test User',
        bio: 'Original bio',
        theme: 'purple'
      });
    });

    it('should return 401 if no token provided', async () => {
      const res = await request(app)
        .get('/api/profile');

      expect(res.status).toBe(401);
    });

    it('should return 401 if invalid token provided', async () => {
      const res = await request(app)
        .get('/api/profile')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/profile', () => {
    it('should update user profile', async () => {
      const updateData = {
        name: 'Updated Name',
        bio: 'Updated bio'
      };

      const res = await request(app)
        .patch('/api/profile')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.profile).toMatchObject({
        name: 'Updated Name',
        bio: 'Updated bio',
        theme: 'purple' // Original theme should remain unchanged
      });

      // Verify database was updated
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.profile.name).toBe('Updated Name');
      expect(updatedUser.profile.bio).toBe('Updated bio');
    });

    it('should allow partial profile updates', async () => {
      const res = await request(app)
        .patch('/api/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(200);
      expect(res.body.profile).toMatchObject({
        name: 'Updated Name',
        bio: 'Original bio' // Should remain unchanged
      });
    });

    it('should handle empty update data', async () => {
      const res = await request(app)
        .patch('/api/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.profile).toMatchObject({
        name: 'Test User',
        bio: 'Original bio'
      });
    });
  });

  describe('POST /api/profile/image', () => {
    let testImagePath;
    let testImageBuffer;

    beforeAll(async () => {
      // Create a test image file
      testImagePath = path.join(__dirname, '../fixtures/test-image.jpg');
      testImageBuffer = await fs.readFile(testImagePath);
    });

    it('should upload profile image', async () => {
      const res = await request(app)
        .post('/api/profile/image')
        .set('Authorization', `Bearer ${token}`)
        .attach('image', testImageBuffer, 'profile.jpg');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.imageUrl).toBeTruthy();
      expect(res.body.imageUrl).toMatch(/^https:\/\//);

      // Verify database was updated
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.profile.image).toBe(res.body.imageUrl);
    });

    it('should return 400 if no image file provided', async () => {
      const res = await request(app)
        .post('/api/profile/image')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
    });

    it('should handle invalid file types', async () => {
      const res = await request(app)
        .post('/api/profile/image')
        .set('Authorization', `Bearer ${token}`)
        .attach('image', Buffer.from('invalid file'), 'test.txt');

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Invalid file type/);
    });

    it('should handle large files', async () => {
      // Create a buffer larger than the limit (e.g., 6MB)
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024);

      const res = await request(app)
        .post('/api/profile/image')
        .set('Authorization', `Bearer ${token}`)
        .attach('image', largeBuffer, 'large.jpg');

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/File too large/);
    });
  });

  describe('PATCH /api/profile/theme', () => {
    it('should update profile theme', async () => {
      const res = await request(app)
        .patch('/api/profile/theme')
        .set('Authorization', `Bearer ${token}`)
        .send({ theme: 'blue' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.theme).toBe('blue');

      // Verify database was updated
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.profile.theme).toBe('blue');
    });

    it('should validate theme value', async () => {
      const res = await request(app)
        .patch('/api/profile/theme')
        .set('Authorization', `Bearer ${token}`)
        .send({ theme: 'invalid-theme' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Invalid theme/);
    });

    it('should require theme in request body', async () => {
      const res = await request(app)
        .patch('/api/profile/theme')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Theme is required/);
    });
  });

  describe('Profile Rate Limiting', () => {
    it('should handle multiple rapid requests appropriately', async () => {
      const requests = Array(10).fill().map(() => 
        request(app)
          .get('/api/profile')
          .set('Authorization', `Bearer ${token}`)
      );

      const responses = await Promise.all(requests);
      
      // Some requests should succeed
      expect(responses.some(res => res.status === 200)).toBe(true);
      // Later requests might be rate limited
      expect(responses.some(res => res.status === 429)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      // Disconnect from database to simulate error
      await mongoose.disconnect();

      const res = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/database/i);

      // Reconnect for other tests
      await mongoose.connect(process.env.MONGODB_URI);
    });

    it('should handle invalid JSON in request body', async () => {
      const res = await request(app)
        .patch('/api/profile')
        .set('Authorization', `Bearer ${token}`)
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Invalid JSON/);
    });
  });

  describe('Security Tests', () => {
    it('should prevent XSS in profile fields', async () => {
      const xssPayload = '<script>alert("xss")</script>';
      
      const res = await request(app)
        .patch('/api/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: xssPayload,
          bio: xssPayload
        });

      expect(res.status).toBe(200);
      expect(res.body.profile.name).not.toContain('<script>');
      expect(res.body.profile.bio).not.toContain('<script>');
    });

    it('should prevent accessing other user profiles', async () => {
      // Create another user
      const otherUser = await createTestUser({
        email: 'other@example.com',
        password: 'password123'
      });

      const res = await request(app)
        .patch(`/api/profile/${otherUser._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Hacked Name' });

      expect(res.status).toBe(403);
    });
  });

  describe('Profile Data Validation', () => {
    it('should validate name length', async () => {
      const res = await request(app)
        .patch('/api/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'a'.repeat(101) // Assuming max length is 100
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/name.*length/i);
    });

    it('should validate bio length', async () => {
      const res = await request(app)
        .patch('/api/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          bio: 'a'.repeat(501) // Assuming max length is 500
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/bio.*length/i);
    });

    it('should sanitize profile inputs', async () => {
      const res = await request(app)
        .patch('/api/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: '  Test Name  ', // Extra spaces
          bio: 'Bio with \n\n\n multiple \t\t spaces' // Extra whitespace
        });

      expect(res.status).toBe(200);
      expect(res.body.profile.name).toBe('Test Name');
      expect(res.body.profile.bio).toBe('Bio with multiple spaces');
    });
  });
});