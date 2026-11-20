const mongoose = require('mongoose');

const trustEventSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    circle: { type: mongoose.Schema.Types.ObjectId, ref: 'Circle', required: true },
    monthNumber: { type: Number, required: true },
    type: {
      type: String,
      enum: ['OnTimePayment', 'LatePayment', 'MissedPayment'],
      required: true,
    },
    delta: { type: Number, required: true },
    scoreBefore: { type: Number },
    scoreAfter: { type: Number },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
  },
  { timestamps: true }
);

// Only ONE scoring event per member per month: this makes everything idempotent
trustEventSchema.index({ circle: 1, user: 1, monthNumber: 1 }, { unique: true });

module.exports = mongoose.model('TrustEvent', trustEventSchema);