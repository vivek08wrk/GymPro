const Member = require('../models/Member');
const Attendance = require('../models/Attendance');
const MemberProgress = require('../models/MemberProgress');
const { generateMotivationalMessage } = require('./groqService');
const { sendMotivationalMessage } = require('./whatsappService');

const runIrregularMembersAgent = async () => {
  try {
    console.log('🤖 Running irregular members agent...');

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Active members lo
    const activeMembers = await Member.find({ isActive: true });

    for (const member of activeMembers) {

      // Last 7 din ki attendance check karo
      const recentAttendance = await Attendance.find({
        member: member._id,
        checkInTime: { $gte: sevenDaysAgo },
        status: 'present'
      });

      // 7 din mein 2 ya kam baar aaya — irregular hai
      if (recentAttendance.length <= 2) {

        // Progress history lo — motivational message ke liye
        const progressHistory = await MemberProgress.find({
          member: member._id
        })
          .sort({ recordedAt: -1 })
          .limit(5)
          .select('weight chest waist recordedAt trainerNotes');

        // AI se motivational message banao
        const message = await generateMotivationalMessage(member, progressHistory);

        // WhatsApp pe bhejo
        await sendMotivationalMessage(member, message);

        console.log(`💪 Motivational message sent to ${member.name} (${recentAttendance.length} visits in 7 days)`);

        // Rate limit avoid karne ke liye thoda wait karo
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    console.log('✅ Irregular members agent complete');
  } catch (error) {
    console.error('❌ Irregular members agent failed:', error.message);
  }
};

module.exports = { runIrregularMembersAgent };