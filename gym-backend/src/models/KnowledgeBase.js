const mongoose = require('mongoose');

const knowledgeBaseSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  chunks: [
    {
      chunk: { type: String },
      embedding: { type: [Number] }  // Vector stored here
    }
  ],
  uploadedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('KnowledgeBase', knowledgeBaseSchema);