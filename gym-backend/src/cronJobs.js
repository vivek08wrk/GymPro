const cron = require('node-cron');
const Member = require('./models/Member');
const { sendExpiryReminder, sendExpiredMessage } = require('./services/whatsappService');
const { runIrregularMembersAgent } = require('./services/irregularMembersAgent');

// 🚦 ENABLE/DISABLE all cron jobs globally (useful for testing)
const CRON_ENABLED = process.env.CRON_ENABLED !== 'false'; // Default: enabled

const startCronJobs = () => {
  if (!CRON_ENABLED) {
    console.log('⏸️  Cron jobs paused (CRON_ENABLED=false)');
    return;
  }

  // ✅ Daily expiry check — Roz subah 10 baje
  cron.schedule('0 10 * * *', async () => {
    console.log('🔔 Running daily expiry check...');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const allMembers = await Member.find({ isActive: true });

      for (const member of allMembers) {
        // 🔍 Verify member still exists (re-fetch to ensure they weren't deleted)
        const currentMember = await Member.findById(member._id);
        if (!currentMember) {
          console.warn(`⚠️  Member ${member._id} not found in DB, skipping...`);
          continue;
        }

        const expiry = new Date(currentMember.expiryDate);
        const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

        if (daysLeft === 7 || daysLeft === 3 || daysLeft === 1) {
          try {
            await sendExpiryReminder(currentMember, daysLeft);
            console.log(`📱 Expiry reminder sent to ${currentMember.name} — ${daysLeft} days left`);
          } catch (whatsappError) {
            console.error(`❌ Failed to send expiry reminder for ${currentMember.name}:`, whatsappError.message);
          }
        }

        if (daysLeft < 0) {
          try {
            await Member.findByIdAndUpdate(currentMember._id, { isActive: false });
            await sendExpiredMessage(currentMember);
            console.log(`🔴 Membership expired: ${currentMember.name}`);
          } catch (whatsappError) {
            console.error(`❌ Failed to send expired message for ${currentMember.name}:`, whatsappError.message);
          }
        }
      }

      console.log('✅ Daily expiry check complete');
    } catch (error) {
      console.error('❌ Cron job failed:', error.message);
    }
  });

  // ✅ Weekly irregular members check — Har Somwar subah 11 baje
  cron.schedule('0 11 * * 1', async () => {
    console.log('🔔 Running weekly irregular members check...');
    try {
      await runIrregularMembersAgent();
      console.log('✅ Weekly irregular members check complete');
    } catch (error) {
      console.error('❌ Weekly check failed:', error.message);
    }
  });

  console.log('✅ Cron jobs started');
};

module.exports = { startCronJobs };