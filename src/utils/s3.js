// src/utils/s3.js

import AWS from 'aws-sdk';
import { ApiError } from './ApiError.js';
import crypto from 'crypto';
import path from 'path';

// Configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION
});

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.AWS_BUCKET_NAME;

/**
 * Generate a unique filename with original extension
 * @param {string} originalName - Original filename
 * @returns {string} Unique filename
 */
const generateUniqueFileName = (originalName) => {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  const extension = path.extname(originalName);
  return `${timestamp}-${randomString}${extension}`;
};

/**
 * Upload a file to S3
 * @param {Buffer|Stream} file - File to upload
 * @param {string} key - S3 key (path)
 * @param {Object} options - Additional options
 * @returns {Promise<string>} Uploaded file URL
 */
export const uploadToS3 = async (file, key, options = {}) => {
  try {
    // Generate unique filename if not provided in key
    const finalKey = key.includes('/') ? 
      key : 
      `uploads/${generateUniqueFileName(key)}`;

    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: finalKey,
      Body: file,
      ACL: options.public ? 'public-read' : 'private',
      ContentType: options.contentType || 'application/octet-stream',
      ...options
    };

    // Add content encoding if provided
    if (options.contentEncoding) {
      uploadParams.ContentEncoding = options.contentEncoding;
    }

    // Handle metadata if provided
    if (options.metadata) {
      uploadParams.Metadata = options.metadata;
    }

    const result = await s3.upload(uploadParams).promise();
    return result.Location;
  } catch (error) {
    console.error('S3 upload error:', error);
    throw new ApiError(500, 'Error uploading file to S3');
  }
};

/**
 * Delete a file from S3
 * @param {string} key - S3 key of the file to delete
 */
export const deleteFromS3 = async (key) => {
  try {
    const deleteParams = {
      Bucket: BUCKET_NAME,
      Key: key
    };

    await s3.deleteObject(deleteParams).promise();
  } catch (error) {
    console.error('S3 delete error:', error);
    throw new ApiError(500, 'Error deleting file from S3');
  }
};

/**
 * Get a signed URL for temporary access to a private S3 file
 * @param {string} key - S3 key of the file
 * @param {number} expirySeconds - URL expiry time in seconds
 * @returns {Promise<string>} Signed URL
 */
export const getSignedUrl = async (key, expirySeconds = 3600) => {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Expires: expirySeconds
    };

    return await s3.getSignedUrlPromise('getObject', params);
  } catch (error) {
    console.error('S3 signed URL error:', error);
    throw new ApiError(500, 'Error generating signed URL');
  }
};

/**
 * Copy a file within S3
 * @param {string} sourceKey - Source file key
 * @param {string} destinationKey - Destination file key
 * @returns {Promise<string>} New file URL
 */
export const copyFileInS3 = async (sourceKey, destinationKey) => {
  try {
    const copyParams = {
      Bucket: BUCKET_NAME,
      CopySource: `${BUCKET_NAME}/${sourceKey}`,
      Key: destinationKey
    };

    const result = await s3.copyObject(copyParams).promise();
    return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${destinationKey}`;
  } catch (error) {
    console.error('S3 copy error:', error);
    throw new ApiError(500, 'Error copying file in S3');
  }
};

/**
 * Check if a file exists in S3
 * @param {string} key - S3 key to check
 * @returns {Promise<boolean>} Whether the file exists
 */
export const checkFileExists = async (key) => {
  try {
    await s3.headObject({
      Bucket: BUCKET_NAME,
      Key: key
    }).promise();
    return true;
  } catch (error) {
    if (error.code === 'NotFound') {
      return false;
    }
    throw new ApiError(500, 'Error checking file existence in S3');
  }
};

/**
 * Get file metadata from S3
 * @param {string} key - S3 key of the file
 * @returns {Promise<Object>} File metadata
 */
export const getFileMetadata = async (key) => {
  try {
    const result = await s3.headObject({
      Bucket: BUCKET_NAME,
      Key: key
    }).promise();

    return {
      contentType: result.ContentType,
      lastModified: result.LastModified,
      contentLength: result.ContentLength,
      metadata: result.Metadata
    };
  } catch (error) {
    console.error('S3 metadata error:', error);
    throw new ApiError(500, 'Error getting file metadata from S3');
  }
};

/**
 * List files in an S3 directory
 * @param {string} prefix - Directory prefix
 * @param {number} limit - Maximum number of files to list
 * @returns {Promise<Array>} Array of file information
 */
export const listFiles = async (prefix = '', limit = 1000) => {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Prefix: prefix,
      MaxKeys: limit
    };

    const result = await s3.listObjectsV2(params).promise();
    return result.Contents.map(item => ({
      key: item.Key,
      size: item.Size,
      lastModified: item.LastModified
    }));
  } catch (error) {
    console.error('S3 list error:', error);
    throw new ApiError(500, 'Error listing files from S3');
  }
};

/**
 * Upload multiple files to S3
 * @param {Array<{file: Buffer|Stream, key: string, options?: Object}>} files - Array of files to upload
 * @returns {Promise<Array<string>>} Array of uploaded file URLs
 */
export const uploadMultipleFiles = async (files) => {
  try {
    const uploadPromises = files.map(({ file, key, options = {} }) => 
      uploadToS3(file, key, options)
    );

    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('S3 multiple upload error:', error);
    throw new ApiError(500, 'Error uploading multiple files to S3');
  }
};

/**
 * Delete multiple files from S3
 * @param {Array<string>} keys - Array of S3 keys to delete
 */
export const deleteMultipleFiles = async (keys) => {
  try {
    const deleteParams = {
      Bucket: BUCKET_NAME,
      Delete: {
        Objects: keys.map(key => ({ Key: key })),
        Quiet: false
      }
    };

    await s3.deleteObjects(deleteParams).promise();
  } catch (error) {
    console.error('S3 multiple delete error:', error);
    throw new ApiError(500, 'Error deleting multiple files from S3');
  }
};

/**
 * Create a pre-signed POST URL for direct browser uploads
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Pre-signed POST data
 */
export const createPresignedPost = async (options = {}) => {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Expires: options.expires || 3600,
      Conditions: [
        ['content-length-range', 0, options.maxSize || 10485760], // Default 10MB
      ],
      Fields: {
        key: options.key || `uploads/${Date.now()}-${crypto.randomBytes(8).toString('hex')}`,
        ...options.fields
      }
    };

    return await s3.createPresignedPost(params);
  } catch (error) {
    console.error('S3 presigned POST error:', error);
    throw new ApiError(500, 'Error creating presigned POST URL');
  }
};