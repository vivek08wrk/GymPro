const Attendance = require('../models/Attendance');
const Member = require('../models/Member');

const markAttendance = async (req, res) => {
  try {
    const member = await Member.findById(req.body.memberId);

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const today = new Date();
    const isExpired = member.expiryDate < today;

    const attendance = await Attendance.create({
      member: member._id,
      status: isExpired ? 'denied' : 'present'
    });

    if (isExpired) {
      return res.status(403).json({
        success: false,
        message: 'Membership expired. Please renew.',
        data: attendance
      });
    }

    res.status(201).json({
      success: true,
      message: `Welcome ${member.name}!`,
      data: attendance
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getMemberAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.find({ member: req.params.memberId })
      .sort({ checkInTime: -1 });
    res.json({ success: true, count: attendance.length, data: attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTodayAttendance = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.find({
      checkInTime: { $gte: today }
    }).populate('member', 'name phone');

    res.json({ success: true, count: attendance.length, data: attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST mark attendance manually (by member name search) - with status (present/absent)
const markManualAttendance = async (req, res) => {
  try {
    const { memberId, status = 'present', date = new Date() } = req.body;

    if (!memberId) {
      return res.status(400).json({ success: false, message: 'memberId is required' });
    }

    if (!['present', 'absent'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be present or absent' });
    }

    const member = await Member.findById(memberId);

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    // Parse the date if string is provided
    let checkInDate = new Date(date);
    const startOfDay = new Date(checkInDate.getFullYear(), checkInDate.getMonth(), checkInDate.getDate(), 0, 0, 0);
    const endOfDay = new Date(checkInDate.getFullYear(), checkInDate.getMonth(), checkInDate.getDate(), 23, 59, 59);

    // ✨ Check if member already has attendance record for this day
    const existingAttendance = await Attendance.findOne({
      member: memberId,
      checkInTime: { $gte: startOfDay, $lte: endOfDay }
    });

    // Check if membership is expired (only applies when marking present, or for info when marking absent)
    const today = new Date();
    const isExpired = member.expiryDate < today;
    
    // Set the time for this date
    checkInDate.setHours(new Date().getHours(), new Date().getMinutes(), 0, 0);

    let attendance;
    let isUpdated = false;

    if (existingAttendance) {
      // ✨ UPDATE existing record with new status (allows owner to correct mistakes)
      const previousStatus = existingAttendance.status.toUpperCase();
      const newStatus = status.toUpperCase();
      
      attendance = await Attendance.findByIdAndUpdate(
        existingAttendance._id,
        {
          status: status,
          updatedBy: 'manual_correction'
        },
        { new: true }
      );
      isUpdated = true;

      // Check if trying to mark present but expired
      if (status === 'present' && isExpired) {
        return res.status(403).json({
          success: false,
          message: `Membership expired. Cannot mark present. Please renew.`,
          data: {
            memberName: member.name,
            status: 'denied',
            reason: 'Expired membership',
            checkInTime: attendance.checkInTime
          }
        });
      }

      // Return success with update message
      const message = previousStatus === newStatus 
        ? `✅ ${member.name} already marked as ${newStatus} on ${new Date(checkInDate).toLocaleDateString('en-IN')}`
        : `🔄 ${member.name}'s status updated from ${previousStatus} → ${newStatus} on ${new Date(checkInDate).toLocaleDateString('en-IN')}`;
      
      return res.status(200).json({
        success: true,
        message: message,
        isUpdated: true,
        data: {
          memberName: member.name,
          phone: member.phone,
          status: attendance.status,
          previousStatus: previousStatus,
          checkInTime: attendance.checkInTime,
          membershipStatus: isExpired ? 'expired' : 'active'
        }
      });
    } else {
      // CREATE new attendance record
      attendance = await Attendance.create({
        member: member._id,
        status: status,
        checkInTime: checkInDate
      });
    }

    if (status === 'present' && isExpired) {
      return res.status(403).json({
        success: false,
        message: `Membership expired. Cannot mark present. Please renew.`,
        data: {
          memberName: member.name,
          status: 'denied',
          reason: 'Expired membership',
          checkInTime: attendance.checkInTime
        }
      });
    }

    res.status(201).json({
      success: true,
      message: `✅ ${member.name} marked as ${status.toUpperCase()} on ${new Date(checkInDate).toLocaleDateString('en-IN')}`,
      data: {
        memberName: member.name,
        phone: member.phone,
        status: status,
        checkInTime: attendance.checkInTime,
        membershipStatus: isExpired ? 'expired' : 'active'
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET search members by name
const searchMembers = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim().length < 2) {
      return res.json({ success: true, count: 0, data: [] });
    }

    const members = await Member.find({
      name: { $regex: query, $options: 'i' }
    }).select('_id name phone isActive expiryDate').limit(10);

    res.json({ success: true, count: members.length, data: members });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET attendance for specific member on specific date
const getMemberAttendanceByDate = async (req, res) => {
  try {
    const { memberId, date } = req.query;

    if (!memberId || !date) {
      return res.status(400).json({ success: false, message: 'memberId and date are required' });
    }

    // Parse date - get entire day
    const queryDate = new Date(date);
    const startOfDay = new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate(), 0, 0, 0);
    const endOfDay = new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate(), 23, 59, 59);

    const attendance = await Attendance.find({
      member: memberId,
      checkInTime: { $gte: startOfDay, $lte: endOfDay }
    }).populate('member', 'name phone');

    res.json({
      success: true,
      queryDate: date,
      count: attendance.length,
      data: attendance
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET attendance for member within date range (e.g., last 30 days)
const getMemberAttendanceByDateRange = async (req, res) => {
  try {
    const { memberId, startDate, endDate } = req.query;

    if (!memberId) {
      return res.status(400).json({ success: false, message: 'memberId is required' });
    }

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days
    const end = endDate ? new Date(endDate) : new Date();

    const attendance = await Attendance.find({
      member: memberId,
      checkInTime: { $gte: start, $lte: end }
    }).sort({ checkInTime: -1 });

    // Calculate stats
    const presentCount = attendance.filter(a => a.status === 'present').length;
    const absentCount = attendance.filter(a => a.status === 'absent').length;
    const deniedCount = attendance.filter(a => a.status === 'denied').length;

    res.json({
      success: true,
      dateRange: { start, end },
      statistics: {
        total: attendance.length,
        present: presentCount,
        absent: absentCount,
        denied: deniedCount,
        attendancePercentage: attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : 0
      },
      data: attendance
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET attendance records for a specific date (all members)
const getAttendanceByDate = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ success: false, message: 'date is required' });
    }

    // Parse date - get entire day
    const queryDate = new Date(date);
    const startOfDay = new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate(), 0, 0, 0);
    const endOfDay = new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate(), 23, 59, 59);

    const attendance = await Attendance.find({
      checkInTime: { $gte: startOfDay, $lte: endOfDay }
    }).populate('member', 'name phone').sort({ checkInTime: -1 });

    const presentCount = attendance.filter(a => a.status === 'present').length;
    const absentCount = attendance.filter(a => a.status === 'absent').length;
    const deniedCount = attendance.filter(a => a.status === 'denied').length;

    res.json({
      success: true,
      date: date,
      statistics: {
        total: attendance.length,
        present: presentCount,
        absent: absentCount,
        denied: deniedCount
      },
      data: attendance
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET monthly attendance summary for a member
const getMemberMonthlySummary = async (req, res) => {
  try {
    const { memberId, year, month } = req.query;

    if (!memberId || !year || !month) {
      return res.status(400).json({ success: false, message: 'memberId, year, and month are required' });
    }

    // Get first and last day of month
    const startOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endOfMonth = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

    const attendance = await Attendance.find({
      member: memberId,
      checkInTime: { $gte: startOfMonth, $lte: endOfMonth }
    }).sort({ checkInTime: 1 });

    // Group by day
    const attendanceByDay = {};
    attendance.forEach(record => {
      const day = new Date(record.checkInTime).toISOString().split('T')[0];
      if (!attendanceByDay[day]) {
        attendanceByDay[day] = [];
      }
      attendanceByDay[day].push(record.status);
    });

    // Calculate summary
    const presentDays = Object.keys(attendanceByDay).filter(day => 
      attendanceByDay[day].includes('present')
    ).length;
    const absentDays = Object.keys(attendanceByDay).filter(day => 
      attendanceByDay[day].includes('absent') && !attendanceByDay[day].includes('present')
    ).length;

    res.json({
      success: true,
      month: `${year}-${String(month).padStart(2, '0')}`,
      statistics: {
        totalDaysWithAttendance: Object.keys(attendanceByDay).length,
        presentDays,
        absentDays,
        attendancePercentage: Object.keys(attendanceByDay).length > 0 
          ? Math.round((presentDays / Object.keys(attendanceByDay).length) * 100)
          : 0
      },
      dailyDetails: attendanceByDay,
      allRecords: attendance
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { 
  markAttendance, 
  getMemberAttendance, 
  getTodayAttendance, 
  markManualAttendance, 
  searchMembers,
  getMemberAttendanceByDate,
  getMemberAttendanceByDateRange,
  getAttendanceByDate,
  getMemberMonthlySummary
};