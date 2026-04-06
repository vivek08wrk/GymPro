const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { addProgress, getMemberProgress } = require('../controllers/progressController');

router.post('/', protect, addProgress);
router.get('/:memberId', protect, getMemberProgress);

module.exports = router;