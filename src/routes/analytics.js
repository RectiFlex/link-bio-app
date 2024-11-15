// src/routes/analytics.js
import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import * as analyticsController from '../controllers/analyticsController.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/dashboard', analyticsController.getDashboard);
router.get('/links/:linkId', analyticsController.getLinkAnalytics);
router.post('/track/:linkId', analyticsController.trackClick);
router.get('/export', analyticsController.exportAnalytics);

export default router;