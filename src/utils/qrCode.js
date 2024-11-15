// utils/qrCode.js
import QRCode from 'qrcode';
import { uploadToS3 } from './s3.js';

export const generateQRCode = async (linkId, url) => {
  const qrBuffer = await QRCode.toBuffer(url);
  const qrUrl = await uploadToS3(qrBuffer, `qr-codes/${linkId}.png`);
  return qrUrl;
};