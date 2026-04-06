const Payment = require('../models/Payment');
const Member = require('../models/Member');

// POST — payment record karo + member ki expiry badhao
const recordPayment = async (req, res) => {
  try {
    const { memberId, amount, paymentMethod, membershipType, newExpiryDate, note } = req.body;

    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    // Payment record banao
    const payment = await Payment.create({
      member: memberId,
      amount,
      paymentMethod,
      membershipType,
      newExpiryDate,
      note
    });

    // Member ki expiry date update karo
    await Member.findByIdAndUpdate(memberId, {
      expiryDate: newExpiryDate,
      isActive: true,
      membershipType
    });

    res.status(201).json({
      success: true,
      message: 'Payment recorded and membership updated',
      data: payment
    });

  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// GET — ek member ki payment history
const getMemberPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ member: req.params.memberId })
      .sort({ paymentDate: -1 });

    res.json({ success: true, count: payments.length, data: payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET — saari payments — dashboard ke liye
const getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('member', 'name phone')
      .sort({ paymentDate: -1 });

    res.json({ success: true, count: payments.length, data: payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET payment stats — last 6 months
const getPaymentStats = async (req, res) => {
  try {
    const stats = await Payment.aggregate([
      {
        $group: {
          _id: {
            month: { $month: '$paymentDate' },
            year: { $year: '$paymentDate' }
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 6 }
    ]);

    const formatted = stats.map((s) => ({
      month: new Date(s._id.year, s._id.month - 1).toLocaleString('en-IN', { month: 'short' }),
      revenue: s.total,
      payments: s.count
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { recordPayment, getMemberPayments, getAllPayments, getPaymentStats };