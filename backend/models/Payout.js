const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema(
  {
    circle: { type: mongoose.Schema.Types.ObjectId, ref: 'Circle', required: true, index: true },
    monthNumber: { type: Number, required: true, min: 1 },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },         // what was actually sent
    expectedAmount: { type: Number, required: true }, // full pot for the month
    proofFile: { type: String, required: true },      // filename only
    status: {
      type: String,
      enum: ['Sent', 'Confirmed', 'Disputed'],
      default: 'Sent',
    },
    sentAt: { type: Date, default: Date.now },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    respondedAt: { type: Date },
    autoConfirmed: { type: Boolean, default: false },
    disputeReason: { type: String, trim: true },
  },
  { timestamps: true }
);

// One payout per month per circle
payoutSchema.index({ circle: 1, monthNumber: 1 }, { unique: true });

module.exports = mongoose.model('Payout', payoutSchema);