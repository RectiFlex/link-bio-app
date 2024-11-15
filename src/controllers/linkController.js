// src/controllers/linkController.js
import Link from '../models/Link.js';
import { ApiError } from '../utils/ApiError.js';
import { generateQRCode } from '../utils/qrCode.js';
import { uploadToS3 } from '../utils/s3.js';

export const createLink = async (req, res, next) => {
  try {
    const { title, url, icon } = req.body;
    const userId = req.user._id;

    // Get highest order number
    const highestOrder = await Link.findOne({ user: userId })
      .sort('-order')
      .select('order');
    
    const link = await Link.create({
      user: userId,
      title,
      url,
      icon,
      order: (highestOrder?.order || 0) + 1,
    });

    // Generate QR code
    const qrCodeUrl = await generateQRCode(`${process.env.CLIENT_URL}/l/${link._id}`);
    link.qrCode = qrCodeUrl;
    await link.save();

    res.status(201).json({
      status: 'success',
      link,
    });
  } catch (error) {
    next(error);
  }
};

export const getLinks = async (req, res, next) => {
  try {
    const links = await Link.find({ user: req.user._id })
      .sort('order');

    res.json({
      status: 'success',
      links,
    });
  } catch (error) {
    next(error);
  }
};

export const updateLink = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, url, icon, isActive } = req.body;

    const link = await Link.findOneAndUpdate(
      { _id: id, user: req.user._id },
      { title, url, icon, isActive },
      { new: true, runValidators: true }
    );

    if (!link) {
      throw new ApiError(404, 'Link not found');
    }

    res.json({
      status: 'success',
      link,
    });
  } catch (error) {
    next(error);
  }
};

export const reorderLink = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newOrder } = req.body;
    const userId = req.user._id;

    const link = await Link.findOne({ _id: id, user: userId });
    if (!link) {
      throw new ApiError(404, 'Link not found');
    }

    const oldOrder = link.order;

    // Update all links between old and new position
    if (newOrder > oldOrder) {
      await Link.updateMany(
        { 
          user: userId,
          order: { $gt: oldOrder, $lte: newOrder }
        },
        { $inc: { order: -1 } }
      );
    } else {
      await Link.updateMany(
        { 
          user: userId,
          order: { $gte: newOrder, $lt: oldOrder }
        },
        { $inc: { order: 1 } }
      );
    }

    link.order = newOrder;
    await link.save();

    const links = await Link.find({ user: userId }).sort('order');

    res.json({
      status: 'success',
      links,
    });
  } catch (error) {
    next(error);
  }
};