const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getAllMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
  toggleMemberStatus,
  sendMotivation
} = require('../controllers/memberController');

router.get('/', protect, getAllMembers);
router.get('/:id', protect, getMemberById);
router.post('/', protect, createMember);
router.put('/:id', protect, updateMember);
router.delete('/:id', protect, deleteMember);
router.patch('/:id/toggle-status', protect, toggleMemberStatus);
router.post('/:id/send-motivation', protect, sendMotivation);

module.exports = router;