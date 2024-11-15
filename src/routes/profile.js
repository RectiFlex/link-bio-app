// src/routes/profile.js
import express from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth.js';
import * as profileController from '../controllers/profileController.js';

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.use(authMiddleware);

router.get('/', profileController.getProfile);
router.patch('/', profileController.updateProfile);
router.post('/image', upload.single('image'), profileController.uploadProfileImage);
router.patch('/theme', profileController.updateTheme);

export default router;