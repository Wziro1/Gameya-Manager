const Circle = require('../models/Circle');
const Payment = require('../models/Payment');
const TrustEvent = require('../models/TrustEvent');
const User = require('../models/User');
const {
  MIN_SCORE,
  MAX_SCORE,
  RULES,
  REJECTED_GRACE_DAYS,
  LEVELS,
} = require('../config/trustRules');
const { endOfDay, getDueDate, getCurrentMonth } = require('../utils/dateUtils');

const DAY_MS = 24 * 60 * 60 * 1000;

const clamp = (n) => Math.min(MAX_SCORE, Math.max(MIN_SCORE, n));

const getTrustLevel = (score) =>
  (LEVELS.find((l) => score >= l.min) || LEVELS[LEVELS.length - 1]).label;

// Records one scoring event and updates the user's score.
// Returns the event, or null if this member/month was already scored.
const applyTrustEvent = async ({ userId, circleId, monthNumber, type, paymentId = null }) => {
  const { delta } = RULES[type];

  // 1. Claim the (circle, user, month) slot: the unique index blocks duplicates
  let event;
  try {
    event = await TrustEvent.create({
      user: userId,
      circle: circleId,
      monthNumber,
      type,
      delta,
      payment: paymentId,
    });
  } catch (err) {
    if (err.code === 11000) return null;
    throw err;
  }

   // 2. Update the score, then clamp it to [MIN_SCORE, MAX_SCORE]
  const updated = await User.findByIdAndUpdate(
    userId,
    { $inc: { trustScore: delta } },
    { new: true }
  );

  if (updated) {
    const raw = updated.trustScore; // value right after the increment
    const clamped = clamp(raw);

    if (clamped !== raw) {
      await User.updateOne({ _id: userId }, { $set: { trustScore: clamped } });
    }

    event.scoreBefore = raw - delta;
    event.scoreAfter = clamped;
    await event.save();
  }

  return event;
};

// Called when the admin verifies a payment
const applyPaymentOutcome = (payment) =>
  applyTrustEvent({
    userId: payment.user,
    circleId: payment.circle,
    monthNumber: payment.monthNumber,
    type: payment.isLate ? 'LatePayment' : 'OnTimePayment',
    paymentId: payment._id,
  });

// Daily job: penalize members who missed a due date. Safe to run repeatedly.
const runMissedPaymentCheck = async () => {
  const now = new Date();
  const circles = await Circle.find({ status: 'Active', startDate: { $ne: null } });
  let penalties = 0;

  for (const circle of circles) {
    const dueMonths = getCurrentMonth(circle.startDate, circle.durationMonths, now);
    if (dueMonths === 0) continue;

    const [payments, events] = await Promise.all([
      Payment.find({ circle: circle._id }).lean(),
      TrustEvent.find({ circle: circle._id }).select('user monthNumber').lean(),
    ]);
    const paymentByKey = new Map(payments.map((p) => [`${p.user}-${p.monthNumber}`, p]));
    const alreadyScored = new Set(events.map((e) => `${e.user}-${e.monthNumber}`));

    for (let month = 1; month <= dueMonths; month++) {
      // Still inside the due day: not missed yet
      if (now <= endOfDay(getDueDate(circle.startDate, month))) continue;

      for (const participant of circle.participants) {
        const key = `${participant.user}-${month}`;
        if (alreadyScored.has(key)) continue;

        const payment = paymentByKey.get(key);

        // A rejected receipt that was never fixed counts as missed after the grace period
        const abandonedRejection =
          payment &&
          payment.status === 'Rejected' &&
          payment.reviewedAt &&
          now > new Date(payment.reviewedAt.getTime() + REJECTED_GRACE_DAYS * DAY_MS);

        // Pending, Verified, or recently rejected receipts are not "missed"
        if (payment && !abandonedRejection) continue;

        const event = await applyTrustEvent({
          userId: participant.user,
          circleId: circle._id,
          monthNumber: month,
          type: 'MissedPayment',
          paymentId: payment ? payment._id : null,
        });
        if (event) penalties++;
      }
    }
  }

  return penalties;
};

module.exports = { applyTrustEvent, applyPaymentOutcome, runMissedPaymentCheck, getTrustLevel };