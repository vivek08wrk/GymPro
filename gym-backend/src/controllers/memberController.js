const Member = require('../models/Member');
const Attendance = require('../models/Attendance');
const Payment = require('../models/Payment');
const MemberProgress = require('../models/MemberProgress');
const QRCode = require('qrcode');
const cloudinary = require('../config/cloudinary');
const { sendWelcomeMessage, sendMotivationalMessage } = require('../services/whatsappService');
const { generateMotivationalMessage } = require('../services/groqService');

// GET all members
const getAllMembers = async (req, res) => {
  try {
    const members = await Member.find().sort({ createdAt: -1 });
    res.json({ success: true, count: members.length, data: members });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET single member by ID
const getMemberById = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    res.json({ success: true, data: member });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST create new member — QR auto generate hoga
const createMember = async (req, res) => {
  try {
    // 1️⃣ Member create
    const member = await Member.create(req.body);
    console.log(`📝 Member created: ${member.name} (${member._id})`);

    // 2️⃣ QR generate (base64) — data:image/png;base64,...
    console.log(`🔄 Generating QR code...`);
    const qrBase64 = await QRCode.toDataURL(member._id.toString());

    // 3️⃣ Upload to Cloudinary (base64 → public URL)
    console.log(`⬆️  Uploading QR to Cloudinary...`);
    const uploadRes = await cloudinary.uploader.upload(qrBase64, {
      folder: 'gym/qr-codes',
      resource_type: 'auto',
      format: 'png'
    });

    if (!uploadRes?.secure_url) {
      throw new Error('Cloudinary upload failed - no URL received');
    }

    // 4️⃣ Save Cloudinary URL (not base64)
    member.qrCode = uploadRes.secure_url;
    await member.save();
    console.log(`💾 QR URL saved: ${uploadRes.secure_url}`);

    // 5️⃣ Send welcome message + QR via WhatsApp
    console.log(`📱 Sending WhatsApp welcome message & QR...`);
    try {
      await sendWelcomeMessage(member);
      console.log(`✅ WhatsApp messages sent successfully`);
    } catch (whatsappError) {
      console.warn(`⚠️  WhatsApp send failed, but member created:`, whatsappError.message);
      // Don't fail the API response if WhatsApp fails
    }

    // 6️⃣ Response
    res.status(201).json({ 
      success: true, 
      data: member,
      message: 'Member created and welcome message sent'
    });

  } catch (error) {
    console.error(`❌ Error creating member:`, error.message);
    res.status(400).json({ success: false, message: error.message });
  }
};

// PUT update member
const updateMember = async (req, res) => {
  try {
    const member = await Member.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    res.json({ success: true, data: member });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE member — Cascade delete all related records
const deleteMember = async (req, res) => {
  try {
    const memberId = req.params.id;
    
    // Verify member exists first
    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    console.log(`🗑️  Deleting member: ${member.name} (${memberId})`);

    // 🔄 Delete all related records in parallel using Promise.all
    const [attendanceDeleted, paymentDeleted, progressDeleted] = await Promise.all([
      Attendance.deleteMany({ member: memberId }).then(result => {
        console.log(`  ✅ Deleted ${result.deletedCount} attendance records`);
        return result.deletedCount;
      }),
      Payment.deleteMany({ member: memberId }).then(result => {
        console.log(`  ✅ Deleted ${result.deletedCount} payment records`);
        return result.deletedCount;
      }),
      MemberProgress.deleteMany({ member: memberId }).then(result => {
        console.log(`  ✅ Deleted ${result.deletedCount} progress records`);
        return result.deletedCount;
      })
    ]);

    // 🗑️  Finally delete the member
    const deletedMember = await Member.findByIdAndDelete(memberId);

    console.log(`✅ Member deleted: ${member.name}`);

    res.json({
      success: true,
      message: 'Member and all related records deleted successfully',
      data: {
        memberName: member.name,
        attendanceRecordsDeleted: attendanceDeleted,
        paymentRecordsDeleted: paymentDeleted,
        progressRecordsDeleted: progressDeleted
      }
    });

  } catch (error) {
    console.error(`❌ Error deleting member:`, error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH toggle member active/inactive status
const toggleMemberStatus = async (req, res) => {
  try {
    const memberId = req.params.id;
    
    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    // Toggle isActive
    member.isActive = !member.isActive;
    await member.save();

    console.log(`🔄 Member status toggled: ${member.name} → ${member.isActive ? 'Active' : 'Inactive'}`);

    res.json({
      success: true,
      message: `Member marked as ${member.isActive ? 'Active' : 'Inactive'}`,
      data: member
    });
  } catch (error) {
    console.error(`❌ Error toggling member status:`, error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST send manual motivational message
const sendMotivation = async (req, res) => {
  try {
    const memberId = req.params.id;
    
    // Fetch member
    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    // Fetch last 5 progress records
    const progressHistory = await MemberProgress.find({ member: memberId })
      .sort({ recordedAt: -1 })
      .limit(5);

    // Generate motivational message using Groq
    console.log(`🤖 Generating motivational message for ${member.name}...`);
    const motivationalText = await generateMotivationalMessage(member, progressHistory);

    // Send via WhatsApp
    console.log(`📱 Sending motivational message to ${member.phone}...`);
    await sendMotivationalMessage(member, motivationalText);

    console.log(`✅ Motivational message sent to ${member.name}`);
    res.json({
      success: true,
      message: 'Motivational message sent successfully',
      data: {
        memberName: member.name,
        message: motivationalText
      }
    });
  } catch (error) {
    console.error(`❌ Error sending motivational message:`, error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getAllMembers, getMemberById, createMember, updateMember, deleteMember, toggleMemberStatus, sendMotivation };