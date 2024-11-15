// src/utils/analytics.js
import UAParser from 'ua-parser-js';
import axios from 'axios';

export const parseUserAgent = (userAgent) => {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  return {
    device: result.device.type || 'desktop',
    os: result.os.name,
    browser: result.browser.name,
  };
};

export const getLocationFromIP = async (ip) => {
  try {
    const response = await axios.get(`https://ipapi.co/${ip}/json/`);
    return {
      country: response.data.country_name,
      city: response.data.city,
    };
  } catch (error) {
    console.error('Error getting location from IP:', error);
    return {
      country: 'Unknown',
      city: 'Unknown',
    };
  }
};