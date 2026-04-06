const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  member: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'upi', 'card'],
    default: 'cash'
  },
  membershipType: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly'],
    required: true
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  newExpiryDate: {
    type: Date,
    required: true  // payment ke baad member ki expiry yahan tak badh jaayegi
  },
  note: {
    type: String,
    trim: true  // optional — "paid in two installments" etc
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Payment', paymentSchema);