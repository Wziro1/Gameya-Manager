const Circle = require('../models/Circle');
const Payment = require('../models/Payment');
const Payout = require('../models/Payout');
const User = require('../models/User');
const { getTrustLevel } = require('../services/trustService');
const { endOfDay, getDueDate, getCurrentMonth } = require('../utils/dateUtils');

// GET /api/dashboard
exports.getDashboard = async (req, res) => {
  try {
    const me = req.user._id;
    const now = new Date();

    // Every unfinished circle I belong to (admins are participants too)
    const circles = await Circle.find({
      'participants.user': me,
      status: { $in: ['Recruiting', 'Active'] },
    }).lean();

    const activeCircles = circles.filter((c) => c.status === 'Active');
    const recruitingCircles = circles.filter((c) => c.status === 'Recruiting');
    const activeIds = activeCircles.map((c) => c._id);

    const [payments, payouts] = await Promise.all([
      Payment.find({ circle: { $in: activeIds } }).lean(),
      Payout.find({ circle: { $in: activeIds } }).lean(),
    ]);

    const circleNames = new Map(circles.map((c) => [String(c._id), c.name]));
    const myPayments = new Map(
      payments.filter((p) => p.user.equals(me)).map((p) => [`${p.circle}-${p.monthNumber}`, p])
    );
    const payoutByKey = new Map(payouts.map((p) => [`${p.circle}-${p.monthNumber}`, p]));

    // ---------- Participant side ----------

    const paymentsDue = [];
    for (const c of activeCircles) {
      const payableUpTo = Math.max(getCurrentMonth(c.startDate, c.durationMonths, now), 1);
      for (let month = 1; month <= payableUpTo; month++) {
        const p = myPayments.get(`${c._id}-${month}`);
        if (p && p.status !== 'Rejected') continue; // Pending or Verified: nothing to do

        const due = getDueDate(c.startDate, month);
        paymentsDue.push({
          circleId: c._id,
          circleName: c.name,
          monthNumber: month,
          amount: c.monthlyInstallment,
          dueDate: due,
          status: p ? 'Rejected' : now > endOfDay(due) ? 'Overdue' : 'Due',
          rejectionReason: p ? p.rejectionReason || null : null,
        });
      }
    }
    paymentsDue.sort((a, b) => a.dueDate - b.dueDate);

    const payoutsToConfirm = payouts
      .filter((p) => p.recipient.equals(me) && p.status === 'Sent')
      .map((p) => ({
        payoutId: p._id,
        circleId: p.circle,
        circleName: circleNames.get(String(p.circle)),
        monthNumber: p.monthNumber,
        amount: p.amount,
        sentAt: p.sentAt,
      }));

    const payoutSchedule = activeCircles
      .map((c) => {
        const mine = c.participants.find((p) => p.user.equals(me));
        const payout = payoutByKey.get(`${c._id}-${mine.payoutTurn}`);
        return {
          circleId: c._id,
          circleName: c.name,
          payoutTurn: mine.payoutTurn,
          payoutDate: getDueDate(c.startDate, mine.payoutTurn),
          amount: c.totalAmount,
          payoutStatus: payout ? payout.status : 'NotSent',
        };
      })
      .sort((a, b) => a.payoutDate - b.payoutDate);

    const nextPayout = payoutSchedule.find((s) => s.payoutStatus !== 'Confirmed') || null;

    const pendingJoinRequests = recruitingCircles
      .filter((c) => !c.creator.equals(me))
      .filter((c) => c.participants.some((p) => p.user.equals(me) && p.status === 'Pending'))
      .map((c) => ({ circleId: c._id, circleName: c.name }));

    // ---------- Admin side ----------

    const adminActive = activeCircles.filter((c) => c.creator.equals(me));
    const adminRecruiting = recruitingCircles.filter((c) => c.creator.equals(me));

    const joinRequests = adminRecruiting
      .map((c) => ({
        circleId: c._id,
        circleName: c.name,
        count: c.participants.filter((p) => p.status === 'Pending').length,
      }))
      .filter((r) => r.count > 0);

    const readyToStart = adminRecruiting
      .filter((c) => c.participants.filter((p) => p.status === 'Active').length === c.durationMonths)
      .map((c) => ({ circleId: c._id, circleName: c.name }));

    const receiptsToReview = adminActive
      .map((c) => ({
        circleId: c._id,
        circleName: c.name,
        count: payments.filter((p) => p.circle.equals(c._id) && p.status === 'Pending').length,
      }))
      .filter((r) => r.count > 0);

    const payoutsToSend = [];
    for (const c of adminActive) {
      const payableUpTo = Math.max(getCurrentMonth(c.startDate, c.durationMonths, now), 1);
      const expected = c.participants.length * c.monthlyInstallment;

      for (let month = 1; month <= payableUpTo; month++) {
        const payout = payoutByKey.get(`${c._id}-${month}`);
        if (payout && payout.status !== 'Disputed') continue; // already sent or confirmed

        const verifiedCount = payments.filter(
          (p) => p.circle.equals(c._id) && p.monthNumber === month && p.status === 'Verified'
        ).length;
        if (verifiedCount === 0 && !payout) continue; // nothing to send yet

        const recipient = c.participants.find((p) => p.payoutTurn === month);
        const collected = verifiedCount * c.monthlyInstallment;
        payoutsToSend.push({
          circleId: c._id,
          circleName: c.name,
          monthNumber: month,
          recipientId: recipient ? recipient.user : null,
          collected,
          expected,
          fullyCollected: collected === expected,
          disputed: Boolean(payout),
          disputeReason: payout ? payout.disputeReason || null : null,
        });
      }
    }

    // Attach recipient names with one query
    const recipientIds = [...new Set(payoutsToSend.map((p) => String(p.recipientId)))];
    const users = await User.find({ _id: { $in: recipientIds } }).select('name').lean();
    const nameById = new Map(users.map((u) => [String(u._id), u.name]));
    payoutsToSend.forEach((p) => {
      p.recipientName = nameById.get(String(p.recipientId)) || null;
    });

    const totalActions =
      paymentsDue.length +
      payoutsToConfirm.length +
      joinRequests.length +
      readyToStart.length +
      receiptsToReview.length +
      payoutsToSend.length;

    res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        trustScore: req.user.trustScore,
        level: getTrustLevel(req.user.trustScore),
      },
      summary: {
        activeCircles: activeCircles.length,
        recruitingCircles: recruitingCircles.length,
        totalActions,
      },
      participant: { paymentsDue, payoutsToConfirm, nextPayout, payoutSchedule, pendingJoinRequests },
      admin: { joinRequests, readyToStart, receiptsToReview, payoutsToSend },
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};