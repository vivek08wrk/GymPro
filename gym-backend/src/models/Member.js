const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  address: {
    type: String,
    trim: true
  },
  membershipType: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly'],
    default: 'monthly'
  },
  joinDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  qrCode: {
    type: String  // QR code image (Week 3 mein add karenge)
  },
  photo: {
    type: String  // Profile photo URL (optional)
  }
}, {
  timestamps: true  // createdAt and updatedAt auto add ho jaayega
});

module.exports = mongoose.model('Member', memberSchema);