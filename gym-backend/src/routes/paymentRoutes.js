const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { recordPayment, getMemberPayments, getAllPayments, getPaymentStats  } = require('../controllers/paymentController');

router.get('/stats', protect, getPaymentStats);
router.post('/', protect, recordPayment);
router.get('/', protect, getAllPayments);
router.get('/:memberId', protect, getMemberPayments);


module.exports = router;