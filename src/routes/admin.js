// src/routes/admin.js
import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { adminAuth, checkPermission } from '../middleware/adminAuth.js';
import * as adminController from '../controllers/adminController.js';

const router = express.Router();

router.use(authMiddleware, adminAuth);

// User management
router.get('/users', 
  checkPermission('manage_users'), 
  adminController.getUsers
);
router.get('/users/:id', 
  checkPermission('manage_users'), 
  adminController.getUserDetails
);
router.patch('/users/:id', 
  checkPermission('manage_users'), 
  adminController.updateUser
);
router.delete('/users/:id', 
  checkPermission('manage_users'), 
  adminController.deleteUser
);

// Analytics
router.get('/analytics/global', 
  checkPermission('view_analytics'), 
  adminController.getGlobalAnalytics
);
router.get('/analytics/export', 
  checkPermission('view_analytics'), 
  adminController.exportAnalytics
);

// Settings
router.get('/settings', 
    checkPermission('manage_settings'), 
    adminController.getSettings
  );
  router.patch('/settings', 
    checkPermission('manage_settings'), 
    adminController.updateSettings
  );
  
  // Admin management (super-admin only)
  router.get('/admins', 
    checkPermission('manage_admins'), 
    adminController.getAdmins
  );
  router.post('/admins', 
    checkPermission('manage_admins'), 
    adminController.createAdmin
  );
  router.delete('/admins/:id', 
    checkPermission('manage_admins'), 
    adminController.removeAdmin
  );
  
  export default router;