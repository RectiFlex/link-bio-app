// src/controllers/authController.js
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { sendEmail } from '../utils/email.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

export const signup = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    if (await User.findOne({ email })) {
      throw new ApiError(400, 'Email already registered');
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    const user = await User.create({
      email,
      password,
      profile: { name },
      verificationToken,
    });

    // Send verification email
    const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;
    await sendEmail({
      to: email,
      subject: 'Verify your email',
      text: `Please verify your email by clicking: ${verificationUrl}`,
    });

    const token = generateToken(user._id);

    res.status(201).json({
      status: 'success',
      token,
      user: {
        id: user._id,
        email: user.email,
        profile: user.profile,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    
    if (!user || !(await user.comparePassword(password))) {
      throw new ApiError(401, 'Invalid email or password');
    }

    const token = generateToken(user._id);

    res.json({
      status: 'success',
      token,
      user: {
        id: user._id,
        email: user.email,
        profile: user.profile,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      throw new ApiError(404, 'No user found with this email');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    await sendEmail({
      to: email,
      subject: 'Reset your password',
      text: `Reset your password by clicking: ${resetUrl}`,
    });

    res.json({
      status: 'success',
      message: 'Password reset email sent',
    });
  } catch (error) {
    next(error);
  }
};