const MemberProgress = require('../models/MemberProgress');

const addProgress = async (req, res) => {
  try {
    const progress = await MemberProgress.create(req.body);
    res.status(201).json({ success: true, data: progress });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getMemberProgress = async (req, res) => {
  try {
    const progress = await MemberProgress.find({ member: req.params.memberId })
      .sort({ recordedAt: -1 });
    res.json({ success: true, data: progress });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { addProgress, getMemberProgress };