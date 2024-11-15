// config/passport.js
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import User from '../models/User.js';

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/api/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ email: profile.emails[0].value });
    
    if (!user) {
      user = await User.create({
        email: profile.emails[0].value,
        profile: {
          name: profile.displayName,
          image: profile.photos[0].value,
        },
        isVerified: true,
        socialProvider: 'google',
        socialId: profile.id
      });
    }

    done(null, user);
  } catch (error) {
    done(error, null);
  }
}));