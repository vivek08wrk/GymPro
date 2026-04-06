const mongoose = require('mongoose');

const memberProgressSchema = new mongoose.Schema({
  member: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true
  },

  // Body measurements
  weight: { type: Number },              // kg
  height: { type: Number },             // cm
  bodyFatPercentage: { type: Number },
  chest: { type: Number },              // cm
  waist: { type: Number },              // cm
  hips: { type: Number },               // cm
  bmi: { type: Number },                // auto calculate karenge

  // Workout log
  exercisesPerformed: [
    {
      name: { type: String },           // "Bench Press"
      sets: { type: Number },
      reps: { type: Number },
      weightKg: { type: Number }
    }
  ],

  // Diet log
  diet: {
    calories: { type: Number },
    proteinGrams: { type: Number },
    notes: { type: String }
  },

  // Attendance pattern (Week 6 agent isko use karega)
  attendanceNote: { type: String },     // "missed 5 days this week"

  // Trainer notes
  trainerNotes: { type: String },

  recordedAt: {
    type: Date,
    default: Date.now
  }

}, { timestamps: true });

// BMI auto-calculate karo jab bhi save ho
memberProgressSchema.pre('save', function (next) {
  if (this.weight && this.height) {
    const heightInMeters = this.height / 100;
    this.bmi = parseFloat((this.weight / (heightInMeters * heightInMeters)).toFixed(1));
  }
  next();
});

module.exports = mongoose.model('MemberProgress', memberProgressSchema);