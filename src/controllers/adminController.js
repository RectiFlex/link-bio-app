// src/controllers/adminController.js
import User from '../models/User.js';
import Link from '../models/Link.js';
import Admin from '../models/Admin.js';
import Analytics from '../models/Analytics.js';
import { ApiError } from '../utils/ApiError.js';
import { generateCSV } from '../utils/export.js';

export const getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';

    const query = search ? {
      $or: [
        { 'profile.name': { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    } : {};

    const users = await User.find(query)
      .select('-password')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort('-createdAt');

    const total = await User.countDocuments(query);

    const stats = {
      total,
      active: await User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 30*24*60*60*1000) }}),
      verified: await User.countDocuments({ isVerified: true }),
      withLinks: await User.countDocuments({ $exists: { links: true } })
    };

    res.json({
      status: 'success',
      data: {
        users,
        stats,
        pagination: {
          page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getUserDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('-password');
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Get user's links and analytics
    const links = await Link.find({ user: id });
    const analytics = await Analytics.aggregate([
      {
        $match: {
          link: { $in: links.map(link => link._id) }
        }
      },
      {
        $group: {
          _id: null,
          totalClicks: { $sum: '$totalClicks' },
          uniqueVisitors: { $sum: '$uniqueVisitors' }
        }
      }
    ]);

    res.json({
      status: 'success',
      data: {
        user,
        links,
        analytics: analytics[0] || { totalClicks: 0, uniqueVisitors: 0 }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getGlobalAnalytics = async (req, res, next) => {
  try {
    const timeframe = req.query.timeframe || '30d'; // 7d, 30d, 90d
    const startDate = new Date();
    
    switch(timeframe) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    const analytics = await Analytics.aggregate([
      {
        $match: {
          'clicks.timestamp': { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalClicks: { $sum: '$totalClicks' },
          uniqueVisitors: { $sum: '$uniqueVisitors' },
          clicksByDay: {
            $push: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$clicks.timestamp' } },
              count: { $size: '$clicks' }
            }
          },
          deviceTypes: {
            $push: '$clicks.device'
          },
          countries: {
            $push: '$clicks.location.country'
          }
        }
      }
    ]);

    // Get user growth data
    const userGrowth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.json({
      status: 'success',
      data: {
        analytics: analytics[0] || {
          totalClicks: 0,
          uniqueVisitors: 0,
          clicksByDay: [],
          deviceTypes: [],
          countries: []
        },
        userGrowth
      }
    });
  } catch (error) {
    next(error);
  }
};

export const createAdmin = async (req, res, next) => {
  try {
    const { userId, role, permissions } = req.body;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Check if already an admin
    const existingAdmin = await Admin.findOne({ user: userId });
    if (existingAdmin) {
      throw new ApiError(400, 'User is already an admin');
    }

    const admin = await Admin.create({
      user: userId,
      role,
      permissions
    });

    res.status(201).json({
      status: 'success',
      data: {
        admin
      }
    });
  } catch (error) {
    next(error);
  }
};

export const exportAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const format = req.query.format || 'csv';

    const analytics = await Analytics.aggregate([
      {
        $match: {
          'clicks.timestamp': {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        }
      },
      {
        $unwind: '$clicks'
      },
      {
        $project: {
          date: '$clicks.timestamp',
          device: '$clicks.device',
          browser: '$clicks.browser',
          country: '$clicks.location.country',
          city: '$clicks.location.city',
          referrer: '$clicks.referrer'
        }
      }
    ]);

    if (format === 'csv') {
      const csv = generateCSV(analytics);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=analytics-${startDate}-${endDate}.csv`);
      res.send(csv);
    } else {
      res.json({
        status: 'success',
        data: analytics
      });
    }
  } catch (error) {
    next(error);
  }
};