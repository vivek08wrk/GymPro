const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = require('./src/db');
const { startCronJobs } = require('./src/cronJobs');

const authRoutes = require('./src/routes/authRoutes');
const memberRoutes = require('./src/routes/memberRoutes');
const attendanceRoutes = require('./src/routes/attendanceRoutes');
const paymentRoutes = require('./src/routes/paymentRoutes');
const progressRoutes = require('./src/routes/progressRoutes');
const ragRoutes = require('./src/routes/ragRoutes');

const app = express();

let dbConnected = false;
let cronStarted = false;

mongoose.connection.on('connected', () => {
  dbConnected = true;
});

mongoose.connection.on('disconnected', () => {
  dbConnected = false;
});

// 🔐 CORS configuration (allowlist)
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3006',
  'https://gym-pro-eta.vercel.app',
];

const normalizeOrigin = (origin) => {
  if (!origin) return origin;
  return origin.endsWith('/') ? origin.slice(0, -1) : origin;
};

const corsOptions = {
  origin: (origin, callback) => {
    const normalized = normalizeOrigin(origin);
    const isAllowed = !normalized || allowedOrigins.includes(normalized);

    // Do NOT throw on blocked origins; failing closed is enough.
    // Throwing often results in 500 responses without CORS headers.
    callback(null, isAllowed);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());

// ✅ Health endpoints
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    dbConnected,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (req, res) => {
  res.json({ message: 'Gym backend is running!' });
});

// ✅ API Routes
app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/rag', ragRoutes);

const initDbAndCrons = async (attempt = 1) => {
  try {
    await connectDB();
    if (!cronStarted) {
      startCronJobs();
      cronStarted = true;
    }
  } catch (error) {
    dbConnected = false;
    const delayMs = Number(process.env.DB_RETRY_DELAY_MS || 10000);
    console.error(
      `❌ DB init failed (attempt ${attempt}). Retrying in ${delayMs}ms...`,
      error.message
    );
    setTimeout(() => initDbAndCrons(attempt + 1), delayMs);
  }
};

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  initDbAndCrons();
});