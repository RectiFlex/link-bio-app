// src/routes/auth.js
import express from 'express';
import * as authController from '../controllers/authController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);
router.post('/verify-email/:token', authController.verifyEmail);
router.get('/me', authMiddleware, authController.getProfile);

export default router;