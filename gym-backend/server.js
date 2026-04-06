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

app.use(cors());
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