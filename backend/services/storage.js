const { Readable } = require('stream');
const cloudinary = require('../config/cloudinary');

const FOLDER = 'gameya-manager/receipts';

// Uploads an image buffer as a PRIVATE ("authenticated") asset. Returns its public_id.
const uploadImage = (buffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: FOLDER, type: 'authenticated', resource_type: 'image' },
      (err, result) => (err ? reject(err) : resolve(result.public_id))
    );
    stream.end(buffer);
  });

// Best effort: a failed delete must never break the request
const deleteImage = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, {
      type: 'authenticated',
      resource_type: 'image',
      invalidate: true,
    });
  } catch (err) {
    console.error('Cloudinary delete failed:', err.message);
  }
};

// Streams a private image to the Express response through a signed URL.
// Returns false when the image can't be found.
const sendImage = async (publicId, res) => {
  const url = cloudinary.url(publicId, {
    type: 'authenticated',
    resource_type: 'image',
    sign_url: true,
    secure: true,
  });

  const upstream = await fetch(url);
  if (!upstream.ok) return false;

  res.set('Content-Type', upstream.headers.get('content-type') || 'image/jpeg');
  res.set('Cache-Control', 'private, max-age=300');
  Readable.fromWeb(upstream.body).pipe(res);
  return true;
};

module.exports = { uploadImage, deleteImage, sendImage };