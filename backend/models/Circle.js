const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    payoutTurn: { type: Number, default: null }, // assigned when the circle starts
    status: {
      type: String,
      enum: ['Pending', 'Active', 'Completed'],
      default: 'Pending',
    },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const circleSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Circle name is required'], trim: true },
    totalAmount: { type: Number, required: true, min: 1 },
    monthlyInstallment: { type: Number, required: true, min: 1 },
    durationMonths: { type: Number, required: true, min: 2 },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    inviteCode: { type: String, unique: true, required: true },
    participants: [participantSchema],
    status: {
      type: String,
      enum: ['Recruiting', 'Active', 'Completed'],
      default: 'Recruiting',
    },
    startDate: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Circle', circleSchema);