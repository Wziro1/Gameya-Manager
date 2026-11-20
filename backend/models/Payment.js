const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    circle: { type: mongoose.Schema.Types.ObjectId, ref: 'Circle', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    monthNumber: { type: Number, required: true, min: 1 },
    amount: { type: Number, required: true },
    receiptFile: { type: String, required: true }, // filename only, never a path
    status: {
      type: String,
      enum: ['Pending', 'Verified', 'Rejected'],
      default: 'Pending',
    },
    dueDate: { type: Date, required: true },
    isLate: { type: Boolean, default: false },
    submittedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: { type: String, trim: true },
  },
  { timestamps: true }
);

// One payment record per member per month
paymentSchema.index({ circle: 1, user: 1, monthNumber: 1 }, { unique: true });

module.exports = mongoose.model('Payment', paymentSchema);