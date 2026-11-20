const mongoose = require('mongoose');
const Circle = require('../models/Circle');
const Payment = require('../models/Payment');
const Payout = require('../models/Payout');
const { uploadImage, deleteImage, sendImage } = require('../services/storage');
const { endOfDay, getDueDate, getCurrentMonth } = require('../utils/dateUtils');
const { applyPaymentOutcome } = require('../services/trustService');



// ---------- Helpers ----------

const removeFile = (filePath) => {
  if (filePath) fs.unlink(filePath, () => { }); // best effort
};

const findCircle = (id) => (mongoose.isValidObjectId(id) ? Circle.findById(id) : null);

const toPublic = (p) => ({
  id: p._id,
  circle: p.circle,
  user: p.user,
  monthNumber: p.monthNumber,
  amount: p.amount,
  status: p.status,
  isLate: p.isLate,
  dueDate: p.dueDate,
  submittedAt: p.submittedAt,
  reviewedAt: p.reviewedAt,
  rejectionReason: p.rejectionReason,
  receiptUrl: `/api/payments/${p._id}/receipt`,
});

const handleError = (res, label, err) => {
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: Object.values(err.errors)[0].message });
  }
  console.error(`${label}:`, err);
  res.status(500).json({ message: 'Server error' });
};

// ---------- POST /api/payments  (multipart/form-data) ----------
// Fields: circleId, monthNumber, receipt (image file)
exports.submitPayment = async (req, res) => {
  let uploadedId = null; // Cloudinary public_id, deleted again if saving fails
  const fail = (status, message) => res.status(status).json({ message });

  try {
    if (!req.file) return fail(400, 'Receipt image is required');

    const monthNumber = Number(req.body.monthNumber);
    const circle = await findCircle(req.body.circleId);
    if (!circle) return fail(404, 'Circle not found');
    if (circle.status !== 'Active') {
      return fail(400, 'Payments are only accepted while the circle is active');
    }
    if (!circle.participants.some((p) => p.user.equals(req.user._id))) {
      return fail(403, 'You are not a member of this circle');
    }
    if (!Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > circle.durationMonths) {
      return fail(400, `Month must be a whole number between 1 and ${circle.durationMonths}`);
    }

    const payableUpTo = Math.max(getCurrentMonth(circle.startDate, circle.durationMonths), 1);
    if (monthNumber > payableUpTo) {
      return fail(400, 'You can only pay for the current month or earlier months');
    }

    const now = new Date();
    const dueDate = getDueDate(circle.startDate, monthNumber);

    let payment = await Payment.findOne({
      circle: circle._id,
      user: req.user._id,
      monthNumber,
    });

    if (payment && payment.status !== 'Rejected') {
      return fail(
        409,
        payment.status === 'Verified'
          ? 'This month is already paid and verified'
          : 'A receipt for this month is already awaiting review'
      );
    }

    // Everything is valid: only now upload the image
    uploadedId = await uploadImage(req.file.buffer);

    if (payment) {
      // Resubmission after rejection: replace receipt, keep original isLate
      const oldFile = payment.receiptFile;
      payment.receiptFile = uploadedId;
      payment.status = 'Pending';
      payment.submittedAt = now;
      payment.rejectionReason = undefined;
      payment.reviewedAt = undefined;
      payment.reviewedBy = undefined;
      await payment.save();
      uploadedId = null; // saved: keep the new image
      await deleteImage(oldFile);
    } else {
      payment = await Payment.create({
        circle: circle._id,
        user: req.user._id,
        monthNumber,
        amount: circle.monthlyInstallment,
        receiptFile: uploadedId,
        dueDate,
        isLate: now > endOfDay(dueDate),
        submittedAt: now,
      });
      uploadedId = null;
    }

    res.status(201).json({
      message: 'Receipt submitted, waiting for admin review',
      payment: toPublic(payment),
    });
  } catch (err) {
    await deleteImage(uploadedId);
    if (err.code === 11000) {
      return res.status(409).json({ message: 'A receipt for this month already exists' });
    }
    handleError(res, 'Submit payment error', err);
  }
};

// ---------- GET /api/payments/circle/:circleId/pending  (Admin only) ----------
exports.getPendingPayments = async (req, res) => {
  try {
    const circle = await findCircle(req.params.circleId);
    if (!circle) return res.status(404).json({ message: 'Circle not found' });
    if (!circle.creator.equals(req.user._id)) {
      return res.status(403).json({ message: 'Only the circle admin can view the review queue' });
    }

    const payments = await Payment.find({ circle: circle._id, status: 'Pending' })
      .populate('user', 'name phone trustScore')
      .sort('submittedAt')
      .lean();

    res.json({ payments: payments.map(toPublic) });
  } catch (err) {
    handleError(res, 'Get pending payments error', err);
  }
};

// ---------- PATCH /api/payments/:id/review  (Admin only) ----------
// Body: { "action": "verify" | "reject", "reason": "..." (required for reject) }
exports.reviewPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;
    const reason = String(req.body.reason || '').trim();

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    if (!['verify', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Action must be "verify" or "reject"' });
    }
    if (action === 'reject' && reason.length < 3) {
      return res.status(400).json({ message: 'A reason is required when rejecting a receipt' });
    }

    const payment = await Payment.findById(id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    const circle = await Circle.findById(payment.circle);
    if (!circle || !circle.creator.equals(req.user._id)) {
      return res.status(403).json({ message: 'Only the circle admin can review payments' });
    }
    if (payment.status !== 'Pending') {
      return res.status(400).json({ message: 'Only pending payments can be reviewed' });
    }

    payment.status = action === 'verify' ? 'Verified' : 'Rejected';
    payment.reviewedAt = new Date();
    payment.reviewedBy = req.user._id;
    payment.rejectionReason = action === 'reject' ? reason : undefined;
    await payment.save();

    // Verified payments change the member's trust score
    let trustEvent = null;
    if (action === 'verify') {
      try {
        trustEvent = await applyPaymentOutcome(payment);
      } catch (e) {
        console.error('Trust score update failed:', e); // verification itself already succeeded
      }
    }

    res.json({
      message: action === 'verify' ? 'Payment verified' : 'Payment rejected',
      payment: toPublic(payment),
      trustChange: trustEvent
        ? { type: trustEvent.type, delta: trustEvent.delta, scoreAfter: trustEvent.scoreAfter }
        : null,
    });
  } catch (err) {
    handleError(res, 'Review payment error', err);
  }
};

// ---------- GET /api/payments/:id/receipt  (payer or admin only) ----------
exports.getReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    const payment = await Payment.findById(id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    const circle = await Circle.findById(payment.circle);
    const isPayer = payment.user.equals(req.user._id);
    const isAdmin = circle && circle.creator.equals(req.user._id);
    if (!isPayer && !isAdmin) {
      return res.status(403).json({ message: 'You do not have access to this receipt' });
    }

    const sent = await sendImage(payment.receiptFile, res);
    if (!sent) return res.status(404).json({ message: 'Receipt file not found' });
  } catch (err) {
    handleError(res, 'Get receipt error', err);
  }
};

// ---------- GET /api/payments/circle/:circleId/ledger  (any member) ----------
exports.getLedger = async (req, res) => {
  try {
    const circle = await findCircle(req.params.circleId);
    if (!circle) return res.status(404).json({ message: 'Circle not found' });

    const isAdmin = circle.creator.equals(req.user._id);
    const isMember = circle.participants.some((p) => p.user.equals(req.user._id));
    if (!isAdmin && !isMember) {
      return res.status(403).json({ message: 'You do not have access to this circle' });
    }
    if (circle.status === 'Recruiting') {
      return res.status(400).json({ message: 'The ledger is available after the circle starts' });
    }

    await circle.populate('participants.user', 'name');
    const payments = await Payment.find({ circle: circle._id }).lean();
    const byKey = new Map(payments.map((p) => [`${p.user}-${p.monthNumber}`, p]));

    const payouts = await Payout.find({ circle: circle._id }).lean();
    const payoutByMonth = new Map(payouts.map((p) => [p.monthNumber, p]));

    const now = new Date();
    const currentMonth = getCurrentMonth(circle.startDate, circle.durationMonths);
    const payableUpTo = Math.max(currentMonth, 1);

    const members = [...circle.participants].sort((a, b) => a.payoutTurn - b.payoutTurn);

    const memberRows = members.map((m) => ({
      userId: m.user._id,
      name: m.user.name,
      payoutTurn: m.payoutTurn,
      payments: Array.from({ length: circle.durationMonths }, (_, i) => {
        const month = i + 1;
        const p = byKey.get(`${m.user._id}-${month}`);
        const due = getDueDate(circle.startDate, month);

        let status;
        if (p) status = p.status; // Pending | Verified | Rejected
        else if (now > endOfDay(due)) status = 'Overdue';
        else if (month <= payableUpTo) status = 'Due';
        else status = 'Upcoming';

        return {
          month,
          status,
          isLate: p ? p.isLate : false,
          paymentId: p ? p._id : null,
          rejectionReason:
            p && (isAdmin || m.user._id.equals(req.user._id)) ? p.rejectionReason || null : null,
        };
      }),
    }));

    const months = Array.from({ length: circle.durationMonths }, (_, i) => {
      const month = i + 1;
      const recipient = members.find((m) => m.payoutTurn === month);
      const verifiedCount = memberRows.filter((r) => r.payments[i].status === 'Verified').length;

      const payout = payoutByMonth.get(month);

      return {
        month,
        dueDate: getDueDate(circle.startDate, month),
        recipient: recipient ? { userId: recipient.user._id, name: recipient.user.name } : null,
        collected: verifiedCount * circle.monthlyInstallment,
        expected: members.length * circle.monthlyInstallment,
        payoutStatus: payout ? payout.status : 'NotSent',
        payoutId: payout ? payout._id : null,
        payoutAmount: payout ? payout.amount : null,
        disputeReason:
          payout && (isAdmin || (recipient && recipient.user._id.equals(req.user._id)))
            ? payout.disputeReason || null
            : null,
      };
    });

    res.json({
      circle: {
        id: circle._id,
        name: circle.name,
        status: circle.status,
        monthlyInstallment: circle.monthlyInstallment,
        totalAmount: circle.totalAmount,
        durationMonths: circle.durationMonths,
        startDate: circle.startDate,
      },
      currentMonth,
      months,
      members: memberRows,
    });
  } catch (err) {
    handleError(res, 'Get ledger error', err);
  }
};