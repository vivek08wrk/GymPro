const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/authMiddleware');
const {
  uploadPDF,
  askQuestion,
  adminInsight,
  listDocuments,
  deleteDocument,
  queryAttendance
} = require('../controllers/ragController');

// Multer setup — PDF files ke liye
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'src/uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

router.post('/upload', protect, upload.single('pdf'), uploadPDF);
router.post('/ask', protect, askQuestion);
router.post('/admin-insight', protect, adminInsight);
router.post('/attendance-query', protect, queryAttendance);
router.get('/documents', protect, listDocuments);
router.delete('/documents/:id', protect, deleteDocument);

module.exports = router;