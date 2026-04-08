const express = require('express');
const cors = require('cors');
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

connectDB();
startCronJobs();

// 🔐 CORS configuration for multiple origins
const allowedOrigins = [
  'http://localhost:3000',           // Local development (default)
  'http://localhost:3006',           // Local development (alternate port)
  'https://gym-pro-eta.vercel.app',  // Production frontend (Vercel)
  'https://localhost:3000',          // HTTPS local
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// ✅ API Routes
app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/rag', ragRoutes);

// ✅ Health check
app.get('/', (req, res) => {
  res.json({ message: 'Gym backend is running!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});