// src/models/Link.js
import mongoose from 'mongoose';

const linkSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
  },
  url: {
    type: String,
    required: [true, 'URL is required'],
    trim: true,
  },
  icon: {
    type: String,
    default: 'link',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  order: {
    type: Number,
    default: 0,
  },
  clicks: {
    type: Number,
    default: 0,
  },
  qrCode: String,
}, { 
  timestamps: true 
});

export default mongoose.model('Link', linkSchema);