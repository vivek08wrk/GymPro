const path = require('path');
const fs = require('fs');
const KnowledgeBase = require('../models/KnowledgeBase');
const { pdfToChunks, getEmbeddings, findRelevantChunks } = require('../services/ragService');
const { askWithContext, askAdminInsight, queryAttendanceData } = require('../services/groqService');
const Member = require('../models/Member');
const Payment = require('../models/Payment');
const Attendance = require('../models/Attendance');

// PDF upload + process karo
const uploadPDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No PDF file uploaded' });
    }

    console.log(`\n📄 ========== PDF UPLOAD STARTED ==========`);
    console.log(`Processing PDF: ${req.file.originalname}`);

    // PDF ko chunks mein todo
    const chunks = await pdfToChunks(req.file.path);

    console.log('🤖 Generating embeddings — this may take a moment...');
    console.log('⚠️  Note: Voyage AI free tier = 3 RPM (22s between requests)');
    console.log(`⏱️   Est. time: ${chunks.length} chunks = ${Math.ceil((chunks.length / 5) * 22)} seconds (${Math.ceil((chunks.length / 5) * 22 / 60)} min)`);

    // Embeddings generate karo — batch mein karo (reduced for rate limiting)
    const batchSize = 5; // Conservative batch size for free tier (3 RPM)
    const allEmbeddings = [];

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const embeddings = await getEmbeddings(batch);
      allEmbeddings.push(...embeddings);
      const progress = Math.min(i + batchSize, chunks.length);
      console.log(`⏳ Processed ${progress}/${chunks.length} chunks`);
    }

    // Chunks + embeddings ek saath save karo
    const chunksWithEmbeddings = chunks.map((chunk, i) => ({
      chunk,
      embedding: allEmbeddings[i]
    }));

    // MongoDB mein save karo
    const kb = await KnowledgeBase.create({
      fileName: req.file.filename,
      originalName: req.file.originalname,
      chunks: chunksWithEmbeddings
    });

    // PDF file delete karo — database mein save ho gayi
    try {
      fs.unlinkSync(req.file.path);
      console.log(`🗑️  Temporary PDF file deleted`);
    } catch (err) {
      console.warn(`⚠️  Could not delete temp file: ${err.message}`);
    }

    console.log(`✅ ========== PDF UPLOADED SUCCESSFULLY ==========\n`);
    
    res.status(201).json({
      success: true,
      message: 'PDF uploaded and processed successfully',
      data: {
        id: kb._id,
        fileName: kb.originalName,
        chunks: chunks.length,
        embeddings: allEmbeddings.length
      }
    });

  } catch (error) {
    console.error(`❌ PDF upload failed:`, error.message);
    
    // Better error messages for rate limiting
    let errorMessage = error.message;
    if (error.message.includes('429') || error.message.includes('rate')) {
      errorMessage = '⚠️ Voyage AI rate limit reached. Free tier = 3 requests/min. Please wait ~20s and try again, or add a payment method for higher limits.';
    }
    
    // Clean up temp file even on error
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        // Ignore cleanup errors
      }
    }

    res.status(error.message.includes('429') ? 429 : 500).json({
      success: false,
      message: errorMessage
    });
  }
};

// Member ka question — RAG se jawab do
const askQuestion = async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Question is required' });
    }

    console.log(`\n❓ ========== ASK QUESTION ==========`);
    console.log(`Question: ${question}`);

    // Saari knowledge base lo
    const allKBs = await KnowledgeBase.find();

    if (allKBs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No documents uploaded yet. Please upload a PDF first.'
      });
    }

    console.log(`📚 Found ${allKBs.length} PDF(s) with total ${allKBs.reduce((sum, kb) => sum + kb.chunks.length, 0)} chunks`);

    // Saare chunks ek jagah karo
    const allChunks = allKBs.flatMap((kb) => kb.chunks);

    // Relevant chunks dhundho
    const relevantChunks = await findRelevantChunks(question, allChunks);

    console.log(`💡 Using ${relevantChunks.length} relevant chunks for context`);
    
    // Groq se jawab lo
    console.log(`🤖 Generating answer with Groq...`);
    const answer = await askWithContext(question, relevantChunks);

    console.log(`✅ ========== ANSWER GENERATED ==========\n`);

    res.json({ 
      success: true, 
      question, 
      answer,
      chunkCount: relevantChunks.length
    });

  } catch (error) {
    console.error(`❌ RAG query failed:`, error.message);
    
    // Better error messages for rate limiting
    let errorMessage = error.message;
    if (error.message.includes('429') || error.message.includes('rate')) {
      errorMessage = '⚠️ Voyage AI rate limit reached. Free tier = 3 requests/min. Please wait ~20s and try again, or add a payment method.';
    }
    
    res.status(error.message.includes('429') ? 429 : 500).json({ 
      success: false, 
      message: errorMessage 
    });
  }
};

// Admin insight — gym data ke baare mein
const adminInsight = async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Question is required' });
    }

    console.log(`\n👨‍💼 ========== ADMIN INSIGHT ==========`);
    console.log(`Analytics Question: ${question}`);

    // Real gym data fetch karo
    const [members, payments, todayAttendance] = await Promise.all([
      Member.find().select('name phone membershipType expiryDate isActive'),
      Payment.find().sort({ paymentDate: -1 }).limit(20),
      Attendance.find({
        checkInTime: { $gte: new Date().setHours(0, 0, 0, 0) }
      }).populate('member', 'name')
    ]);

    const gymData = {
      totalMembers: members.length,
      activeMembers: members.filter((m) => m.isActive).length,
      expiredMembers: members.filter((m) => !m.isActive).length,
      todayAttendance: todayAttendance.length,
      recentPayments: payments,
      memberList: members
    };

    console.log(`📊 Gym Data: ${gymData.totalMembers} members, ${gymData.activeMembers} active, ${gymData.todayAttendance} today`);
    console.log(`💰 Recent payments: ${payments.length} (last 20)`);

    const answer = await askAdminInsight(question, gymData);

    console.log(`✅ ========== INSIGHT GENERATED ==========\n`);

    res.json({ 
      success: true, 
      question, 
      answer,
      gymData: {
        totalMembers: gymData.totalMembers,
        activeMembers: gymData.activeMembers,
        todayAttendance: gymData.todayAttendance
      }
    });

  } catch (error) {
    console.error(`❌ Admin insight failed:`, error.message);
    
    // Better error messages for rate limiting
    let errorMessage = error.message;
    if (error.message.includes('429') || error.message.includes('rate')) {
      errorMessage = '⚠️ Voyage AI rate limit reached. Free tier = 3 requests/min. Please wait ~20s and try again, or add a payment method.';
    }
    
    res.status(error.message.includes('429') ? 429 : 500).json({ 
      success: false, 
      message: errorMessage 
    });
  }
};

// Uploaded PDFs ki list
const listDocuments = async (req, res) => {
  try {
    console.log(`📋 Fetching uploaded documents list...`);
    const docs = await KnowledgeBase.find().select('originalName uploadedAt chunks');
    
    const formatted = docs.map((d) => ({
      id: d._id,
      name: d.originalName,
      chunks: d.chunks.length,
      uploadedAt: d.uploadedAt
    }));

    console.log(`✅ Found ${formatted.length} documents`);
    res.json({ success: true, data: formatted });
  } catch (error) {
    console.error(`❌ Failed to list documents:`, error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PDF delete karo
const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ success: false, message: 'Document ID is required' });
    }

    console.log(`🗑️  Deleting document: ${id}`);
    
    const deleted = await KnowledgeBase.findByIdAndDelete(id);
    
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    console.log(`✅ Document deleted: ${deleted.originalName}`);
    res.json({ success: true, message: 'Document deleted successfully', deletedFile: deleted.originalName });
  } catch (error) {
    console.error(`❌ Failed to delete document:`, error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Attendance query — analyze member attendance patterns
const queryAttendance = async (req, res) => {
  try {
    const { question, memberId } = req.body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Question is required' });
    }

    console.log(`\n📊 ========== ATTENDANCE QUERY ==========`);
    console.log(`Question: ${question}`);

    let attendanceData;

    if (memberId) {
      // Specific member's attendance
      const member = await Member.findById(memberId);
      if (!member) {
        return res.status(404).json({ success: false, message: 'Member not found' });
      }

      const attendance = await Attendance.find({ member: memberId }).sort({ checkInTime: -1 }).limit(90);
      
      const presentCount = attendance.filter(a => a.status === 'present').length;
      const absentCount = attendance.filter(a => a.status === 'absent').length;

      attendanceData = {
        memberName: member.name,
        memberPhone: member.phone,
        totalRecords: attendance.length,
        present: presentCount,
        absent: absentCount,
        attendancePercentage: attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : 0,
        recentAttendance: attendance.slice(0, 30).map(a => ({
          date: new Date(a.checkInTime).toLocaleDateString('en-IN'),
          status: a.status,
          time: new Date(a.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        }))
      };

      console.log(`📋 Attendance for ${member.name}: ${attendance.length} records, ${presentCount} present (${attendanceData.attendancePercentage}%)`);
    } else {
      // All members attendance summary
      const allAttendance = await Attendance.find({ 
        checkInTime: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }).populate('member', 'name');

      const members = await Member.find().select('name phone');
      
      const memberStats = {};
      members.forEach(m => {
        memberStats[m._id] = {
          name: m.name,
          present: 0,
          absent: 0,
          total: 0
        };
      });

      allAttendance.forEach(a => {
        if (memberStats[a.member._id]) {
          memberStats[a.member._id].total++;
          if (a.status === 'present') memberStats[a.member._id].present++;
          else if (a.status === 'absent') memberStats[a.member._id].absent++;
        }
      });

      attendanceData = {
        totalRecords: allAttendance.length,
        period: 'Last 30 days',
        members: Object.values(memberStats).filter(m => m.total > 0)
      };

      console.log(`📊 Overall attendance: ${allAttendance.length} records from ${attendanceData.members.length} members`);
    }

    // Use Groq to analyze and answer
    const answer = await queryAttendanceData(question, attendanceData);

    console.log(`✅ ========== QUERY ANSWERED ==========\n`);

    res.json({
      success: true,
      question,
      answer,
      data: attendanceData
    });

  } catch (error) {
    console.error(`❌ Attendance query failed:`, error.message);
    
    let errorMessage = error.message;
    if (error.message.includes('429') || error.message.includes('rate')) {
      errorMessage = '⚠️ Rate limit reached. Please wait and try again.';
    }

    res.status(error.message.includes('429') ? 429 : 500).json({
      success: false,
      message: errorMessage
    });
  }
};

module.exports = { uploadPDF, askQuestion, adminInsight, listDocuments, deleteDocument, queryAttendance };