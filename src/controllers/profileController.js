// src/controllers/profileController.js
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { uploadToS3 } from '../utils/s3.js';

export const updateProfile = async (req, res, next) => {
  try {
    const { name, bio } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { 
        'profile.name': name,
        'profile.bio': bio,
      },
      { new: true, runValidators: true }
    );

    res.json({
      status: 'success',
      profile: user.profile,
    });
  } catch (error) {
    next(error);
  }
};

export const uploadProfileImage = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ApiError(400, 'No image file provided');
    }

    const imageUrl = await uploadToS3(
      req.file.buffer,
      `profiles/${req.user._id}/${Date.now()}.jpg`
    );

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { 'profile.image': imageUrl },
      { new: true }
    );

    res.json({
      status: 'success',
      imageUrl: user.profile.image,
    });
  } catch (error) {
    next(error);
  }
};