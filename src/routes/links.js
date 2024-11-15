// src/routes/links.js
import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import * as linkController from '../controllers/linkController.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/', linkController.createLink);
router.get('/', linkController.getLinks);
router.patch('/:id', linkController.updateLink);
router.delete('/:id', linkController.deleteLink);
router.post('/:id/reorder', linkController.reorderLink);
router.get('/:id/qr', linkController.generateQRCode);

export default router;