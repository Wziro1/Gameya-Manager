if (process.env.NODE_ENV !== 'production') {
  // Local workaround for networks that block MongoDB Atlas SRV lookups
  require('node:dns').setServers(['8.8.8.8', '1.1.1.1']);
}
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./routes/authRoutes');
const circleRoutes = require('./routes/circleRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const payoutRoutes = require('./routes/payoutRoutes');
const trustRoutes = require('./routes/trustRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const { apiLimiter } = require('./middleware/rateLimiters');
const { rejectOperatorKeys } = require('./middleware/sanitize');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { startScheduler, runDailyChecks } = require('./jobs/scheduler');

// ---------- Config check ----------
const PORT = process.env.PORT || 5000;
const REQUIRED = [
  'MONGO_URI',
  'JWT_SECRET',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
];
const missing = REQUIRED.filter((name) => !process.env[name]);

if (missing.length > 0) {
  console.error(`❌ Missing environment variables: ${missing.join(', ')}`);
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
  console.warn('⚠️  JWT_SECRET is short. Use at least 32 random characters.');
}

const app = express();

// Needed for correct client IPs (rate limiting) behind a hosting proxy
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

// ---------- Security and parsing middleware ----------
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim());

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '10kb' }));
app.use(rejectOperatorKeys);
app.use('/api', apiLimiter);

// ---------- Routes ----------
app.get('/', (req, res) => {
  res.send('Gameya Manager API is running...');
});

// Lightweight route for uptime monitors (does not touch the database)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/circles', circleRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/trust', trustRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Must come after all routes
app.use(notFound);
app.use(errorHandler);

// ---------- Database + start ----------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB successfully');
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });

    startScheduler();
    runDailyChecks(); // catch-up run on every startup (safe to repeat)
  })
  .catch((err) => {
    console.error('❌ Database connection error:', err);
    process.exit(1);
  });