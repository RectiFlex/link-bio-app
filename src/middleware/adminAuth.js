// src/middleware/adminAuth.js
import { ApiError } from '../utils/ApiError.js';
import Admin from '../models/Admin.js';

export const adminAuth = async (req, res, next) => {
  try {
    const admin = await Admin.findOne({ user: req.user._id });
    
    if (!admin) {
      throw new ApiError(403, 'Admin access required');
    }

    req.admin = admin;
    next();
  } catch (error) {
    next(error);
  }
};

export const checkPermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.admin.permissions.includes(permission) && 
          req.admin.role !== 'super-admin') {
        throw new ApiError(403, 'Permission denied');
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};