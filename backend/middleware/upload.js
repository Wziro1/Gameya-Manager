const multer = require('multer');

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED.includes(file.mimetype)) {
      return cb(new Error('Receipt must be a JPG, PNG or WebP image'));
    }
    cb(null, true);
  },
});

// Wrapper so upload errors become clean 400 responses
const uploadReceipt = (req, res, next) => {
  upload.single('receipt')(req, res, (err) => {
    if (err) {
      const message =
        err.code === 'LIMIT_FILE_SIZE' ? 'Receipt must be smaller than 5 MB' : err.message;
      return res.status(400).json({ message });
    }
    next();
  });
};

module.exports = { uploadReceipt };