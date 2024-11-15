// src/controllers/analyticsController.js
import Analytics from '../models/Analytics.js';
import Link from '../models/Link.js';
import { ApiError } from '../utils/ApiError.js';
import { parseUserAgent, getLocationFromIP } from '../utils/analytics.js';

export const trackClick = async (req, res, next) => {
  try {
    const { linkId } = req.params;
    const userAgent = req.headers['user-agent'];
    const ip = req.ip;
    const referrer = req.headers.referrer || req.headers.referer;

    // Parse user agent and get location
    const deviceInfo = parseUserAgent(userAgent);
    const location = await getLocationFromIP(ip);

    const click = {
      device: deviceInfo.device,
      os: deviceInfo.os,
      browser: deviceInfo.browser,
      location,
      referrer,
      ip,
    };

    await Analytics.findOneAndUpdate(
      { link: linkId },
      { 
        $push: { clicks: click },
        $inc: { totalClicks: 1 }
      },
      { upsert: true }
    );

    // Update link click count
    await Link.findByIdAndUpdate(linkId, {
      $inc: { clicks: 1 }
    });

    res.json({ status: 'success' });
  } catch (error) {
    next(error);
  }
};

export const getDashboard = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Get user's links
    const links = await Link.find({ user: userId });
    const linkIds = links.map(link => link._id);

    // Get analytics for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const analytics = await Analytics.aggregate([
      {
        $match: {
          link: { $in: linkIds },
          'clicks.timestamp': { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: null,
          totalClicks: { $sum: '$totalClicks' },
          uniqueVisitors: { $sum: '$uniqueVisitors' },
          clicksByDay: {
            $push: {
              date: '$clicks.timestamp',
              count: { $size: '$clicks' }
            }
          },
          deviceBreakdown: {
            $push: '$clicks.device'
          },
          locationBreakdown: {
            $push: '$clicks.location.country'
          }
        }
      }
    ]);

    res.json({
      status: 'success',
      data: analytics[0] || {
        totalClicks: 0,
        uniqueVisitors: 0,
        clicksByDay: [],
        deviceBreakdown: [],
        locationBreakdown: []
      }
    });
  } catch (error) {
    next(error);
  }
};