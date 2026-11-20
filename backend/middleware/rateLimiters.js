const rateLimit = require('express-rate-limit');

const isProd = process.env.NODE_ENV === 'production';

const createLimiter = (limit, message) =>
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message },
  });

// Whole API
exports.apiLimiter = createLimiter(
  isProd ? 300 : 2000,
  'Too many requests, please try again later'
);

// Login and register only
exports.authLimiter = createLimiter(
  isProd ? 10 : 100,
  'Too many attempts, please try again in 15 minutes'
);