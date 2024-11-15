// src/models/Analytics.js
import mongoose from 'mongoose';

const clickSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
  },
  device: String,
  os: String,
  browser: String,
  location: {
    country: String,
    city: String,
  },
  referrer: String,
  ip: String,
});

const analyticsSchema = new mongoose.Schema({
  link: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Link',
    required: true,
  },
  clicks: [clickSchema],
  dailyStats: [{
    date: Date,
    clicks: Number,
    uniqueVisitors: Number,
  }],
  totalClicks: {
    type: Number,
    default: 0,
  },
  uniqueVisitors: {
    type: Number,
    default: 0,
  },
}, { 
  timestamps: true 
});

export default mongoose.model('Analytics', analyticsSchema);