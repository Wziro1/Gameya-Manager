const mongoose = require('mongoose');
const Circle = require('../models/Circle');
const Payment = require('../models/Payment');
const Payout = require('../models/Payout');
const { uploadImage, deleteImage, sendImage } = require('../services/storage');
const { getCurrentMonth } = require('../utils/dateUtils');
const { confirmPayout } = require('../services/payoutService');

// ---------- Helpers ----------

const removeFile = (filePath) => {
  if (filePath) fs.unlink(filePath, () => {}); // best effort
};

const findCircle = (id) => (mongoose.isValidObjectId(id) ? Circle.findById(id) : null);

const toPublic = (p) => ({
  id: p._id,
  circle: p.circle,
  monthNumber: p.monthNumber,
  recipient: p.recipient,
  amount: p.amount,
  expectedAmount: p.expectedAmount,
  status: p.status,
  sentAt: p.sentAt,
  respondedAt: p.respondedAt,
  autoConfirmed: p.autoConfirmed,
  disputeReason: p.disputeReason,
  proofUrl: `/api/payouts/${p._id}/proof`,
});

const handleError = (res, label, err) => {
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: Object.values(err.errors)[0].message });
  }
  console.error(`${label}:`, err);
  res.status(500).json({ message: 'Server error' });
};

// ---------- POST /api/payouts  (Admin only, multipart/form-data) ----------
// Fields: circleId, monthNumber, receipt (transfer proof image), allowShortfall ("true", optional)
exports.sendPayout = async (req, res) => {
  let uploadedId = null; // Cloudinary public_id, deleted again if saving fails
  const fail = (status, message) => res.status(status).json({ message });

  try {
    if (!req.file) return fail(400, 'Transfer proof image is required');

    const monthNumber = Number(req.body.monthNumber);
    const allowShortfall = String(req.body.allowShortfall).toLowerCase() === 'true';

    const circle = await findCircle(req.body.circleId);
    if (!circle) return fail(404, 'Circle not found');
    if (!circle.creator.equals(req.user._id)) {
      return fail(403, 'Only the circle admin can send payouts');
    }
    if (circle.status !== 'Active') {
      return fail(400, 'Payouts can only be sent while the circle is active');
    }
    if (!Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > circle.durationMonths) {
      return fail(400, `Month must be a whole number between 1 and ${circle.durationMonths}`);
    }

    const payableUpTo = Math.max(getCurrentMonth(circle.startDate, circle.durationMonths), 1);
    if (monthNumber > payableUpTo) {
      return fail(400, 'This month has not come due yet');
    }

    const recipient = circle.participants.find((p) => p.payoutTurn === monthNumber);
    if (!recipient) return fail(400, 'No recipient found for this month');

    // How much has actually been collected (verified) for this month
    const verifiedCount = await Payment.countDocuments({
      circle: circle._id,
      monthNumber,
      status: 'Verified',
    });
    const collected = verifiedCount * circle.monthlyInstallment;
    const expected = circle.participants.length * circle.monthlyInstallment;

    if (collected === 0) {
      return fail(400, 'Nothing has been collected for this month yet');
    }
    if (collected < expected && !allowShortfall) {
      return fail(
        400,
        `Only ${collected} of ${expected} has been collected. Send allowShortfall=true to send the partial amount`
      );
    }

    const now = new Date();
    let payout = await Payout.findOne({ circle: circle._id, monthNumber });

    if (payout && payout.status !== 'Disputed') {
      return fail(
        409,
        payout.status === 'Confirmed'
          ? 'This payout is already confirmed'
          : 'This payout was already sent and is awaiting confirmation'
      );
    }

    // Everything is valid: only now upload the proof
    uploadedId = await uploadImage(req.file.buffer);

    if (payout) {
      // Re-send after a dispute: replace the proof and reopen
      const oldFile = payout.proofFile;
      payout.proofFile = uploadedId;
      payout.amount = collected;
      payout.expectedAmount = expected;
      payout.status = 'Sent';
      payout.sentAt = now;
      payout.sentBy = req.user._id;
      payout.respondedAt = undefined;
      payout.disputeReason = undefined;
      payout.autoConfirmed = false;
      await payout.save();
      uploadedId = null; // saved: keep the new image
      await deleteImage(oldFile);
    } else {
      payout = await Payout.create({
        circle: circle._id,
        monthNumber,
        recipient: recipient.user,
        amount: collected,
        expectedAmount: expected,
        proofFile: uploadedId,
        sentAt: now,
        sentBy: req.user._id,
      });
      uploadedId = null;
    }

    // If the admin is the recipient, there is nobody to confirm: confirm right away
    let circleCompleted = false;
    if (recipient.user.equals(req.user._id)) {
      ({ circleCompleted } = await confirmPayout(payout));
    }

    res.status(201).json({
      message:
        payout.status === 'Confirmed'
          ? 'Payout recorded and confirmed (you are the recipient this month)'
          : 'Payout sent, waiting for the recipient to confirm',
      payout: toPublic(payout),
      circleCompleted,
    });
  } catch (err) {
    await deleteImage(uploadedId);
    if (err.code === 11000) {
      return res.status(409).json({ message: 'A payout for this month already exists' });
    }
    handleError(res, 'Send payout error', err);
  }
};

// ---------- PATCH /api/payouts/:id/respond  (Recipient only) ----------
// Body: { "action": "confirm" | "dispute", "reason": "..." (required for dispute) }
exports.respondToPayout = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;
    const reason = String(req.body.reason || '').trim();

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: 'Payout not found' });
    }
    if (!['confirm', 'dispute'].includes(action)) {
      return res.status(400).json({ message: 'Action must be "confirm" or "dispute"' });
    }
    if (action === 'dispute' && reason.length < 3) {
      return res.status(400).json({ message: 'A reason is required when disputing a payout' });
    }

    const payout = await Payout.findById(id);
    if (!payout) return res.status(404).json({ message: 'Payout not found' });

    if (!payout.recipient.equals(req.user._id)) {
      return res.status(403).json({ message: 'Only the recipient can respond to this payout' });
    }
    if (payout.status !== 'Sent') {
      return res.status(400).json({ message: 'This payout is not awaiting your response' });
    }

    if (action === 'confirm') {
      const { circleCompleted } = await confirmPayout(payout);
      return res.json({
        message: circleCompleted
          ? 'Payout confirmed. The circle is now completed 🎉'
          : 'Payout confirmed',
        payout: toPublic(payout),
        circleCompleted,
      });
    }

    payout.status = 'Disputed';
    payout.disputeReason = reason;
    payout.respondedAt = new Date();
    await payout.save();

    res.json({
      message: 'Payout disputed. The admin has been asked to resolve it',
      payout: toPublic(payout),
      circleCompleted: false,
    });
  } catch (err) {
    handleError(res, 'Respond to payout error', err);
  }
};

// ---------- GET /api/payouts/:id/proof  (admin or recipient only) ----------
exports.getProof = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: 'Payout not found' });
    }

    const payout = await Payout.findById(id);
    if (!payout) return res.status(404).json({ message: 'Payout not found' });

    const circle = await Circle.findById(payout.circle);
    const isRecipient = payout.recipient.equals(req.user._id);
    const isAdmin = circle && circle.creator.equals(req.user._id);
    if (!isRecipient && !isAdmin) {
      return res.status(403).json({ message: 'You do not have access to this proof' });
    }

    const sent = await sendImage(payout.proofFile, res);
    if (!sent) return res.status(404).json({ message: 'Proof file not found' });
  } catch (err) {
    handleError(res, 'Get payout proof error', err);
  }
};