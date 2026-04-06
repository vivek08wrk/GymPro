const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
  markAttendance, 
  getMemberAttendance, 
  getTodayAttendance,
  markManualAttendance,
  searchMembers,
  getMemberAttendanceByDate,
  getMemberAttendanceByDateRange,
  getAttendanceByDate,
  getMemberMonthlySummary
} = require('../controllers/attendanceController');

router.post('/mark', protect, markAttendance);
router.post('/manual', protect, markManualAttendance);
router.get('/today', protect, getTodayAttendance);
router.get('/search', protect, searchMembers);
router.get('/by-date', protect, getMemberAttendanceByDate);
router.get('/by-date-range', protect, getMemberAttendanceByDateRange);
router.get('/date-query', protect, getAttendanceByDate);
router.get('/monthly-summary', protect, getMemberMonthlySummary);
router.get('/:memberId', protect, getMemberAttendance);

module.exports = router;