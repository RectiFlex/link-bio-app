// src/middleware/auth.js
import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError.js';
import User from '../models/User.js';

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'No token provided');
    }

    const token = authHeader.split(' ')[1];
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      throw new ApiError(401, 'Invalid token');
    }

    req.user = user;
    next();
  } catch (error) {
    next(new ApiError(401, 'Not authorized'));
  }
};