// src/models/Admin.js
import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  role: {
    type: String,
    enum: ['admin', 'super-admin'],
    default: 'admin',
  },
  permissions: [{
    type: String,
    enum: [
      'manage_users',
      'view_analytics',
      'manage_settings',
      'manage_billing',
      'manage_admins'
    ],
  }],
  lastLogin: Date,
}, { 
  timestamps: true 
});

export default mongoose.model('Admin', adminSchema);