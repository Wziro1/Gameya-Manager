const Circle = require('../models/Circle');
const Payout = require('../models/Payout');
const { AUTO_CONFIRM_DAYS } = require('../config/payoutRules');

const DAY_MS = 24 * 60 * 60 * 1000;

// Marks the circle Completed once every month's payout is Confirmed
const completeCircleIfDone = async (circleId) => {
  const circle = await Circle.findById(circleId);
  if (!circle || circle.status !== 'Active') return false;

  const confirmed = await Payout.countDocuments({ circle: circle._id, status: 'Confirmed' });
  if (confirmed < circle.durationMonths) return false;

  circle.status = 'Completed';
  circle.completedAt = new Date();
  circle.participants.forEach((p) => {
    p.status = 'Completed';
  });
  await circle.save();
  return true;
};

// Confirms a payout (by the recipient, by the system, or for an admin recipient)
const confirmPayout = async (payout, { auto = false } = {}) => {
  payout.status = 'Confirmed';
  payout.respondedAt = new Date();
  payout.autoConfirmed = auto;
  payout.disputeReason = undefined;
  await payout.save();

  const circleCompleted = await completeCircleIfDone(payout.circle);
  return { payout, circleCompleted };
};

// Daily job: confirm payouts that nobody responded to
const autoConfirmStalePayouts = async () => {
  const cutoff = new Date(Date.now() - AUTO_CONFIRM_DAYS * DAY_MS);
  const stale = await Payout.find({ status: 'Sent', sentAt: { $lt: cutoff } });

  for (const payout of stale) {
    await confirmPayout(payout, { auto: true });
  }
  return stale.length;
};

module.exports = { confirmPayout, completeCircleIfDone, autoConfirmStalePayouts };