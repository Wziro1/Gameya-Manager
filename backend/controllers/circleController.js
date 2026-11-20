const mongoose = require('mongoose');
const crypto = require('crypto');
const Circle = require('../models/Circle');
const { addMonths } = require('../utils/dateUtils');

// ---------- Helpers ----------
// Unbiased Fisher-Yates shuffle using a cryptographically secure RNG
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};


// 32 characters, no confusing ones (0/O, 1/I)
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const randomCode = (length = 6) =>
  Array.from(crypto.randomBytes(length), (b) => CODE_CHARS[b % CODE_CHARS.length]).join('');

const generateUniqueInviteCode = async () => {
  for (let i = 0; i < 5; i++) {
    const code = randomCode();
    if (!(await Circle.exists({ inviteCode: code }))) return code;
  }
  throw new Error('Could not generate a unique invite code');
};

const countByStatus = (circle, status) =>
  circle.participants.filter((p) => p.status === status).length;

const handleError = (res, label, err) => {
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: Object.values(err.errors)[0].message });
  }
  console.error(`${label}:`, err);
  res.status(500).json({ message: 'Server error' });
};

// ---------- POST /api/circles ----------
exports.createCircle = async (req, res) => {
  try {
    const { name, monthlyInstallment, durationMonths } = req.body;
    const installment = Number(monthlyInstallment);
    const months = Number(durationMonths);

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: 'Circle name is required' });
    }
    if (!Number.isFinite(installment) || installment <= 0) {
      return res.status(400).json({ message: 'Monthly installment must be a positive number' });
    }
    if (!Number.isInteger(months) || months < 2 || months > 60) {
      return res.status(400).json({ message: 'Duration must be a whole number between 2 and 60 months' });
    }

    const circle = await Circle.create({
      name: String(name).trim(),
      monthlyInstallment: installment,
      durationMonths: months,
      totalAmount: installment * months,
      creator: req.user._id,
      inviteCode: await generateUniqueInviteCode(),
      participants: [{ user: req.user._id, status: 'Active' }],
    });

    res.status(201).json({ circle });
  } catch (err) {
    handleError(res, 'Create circle error', err);
  }
};

// ---------- POST /api/circles/join ----------
exports.joinCircle = async (req, res) => {
  try {
    const code = String(req.body.inviteCode || '').toUpperCase().trim();
    if (!code) {
      return res.status(400).json({ message: 'Invite code is required' });
    }

    const circle = await Circle.findOne({ inviteCode: code });
    if (!circle) {
      return res.status(404).json({ message: 'Invalid invite code' });
    }
    if (circle.status !== 'Recruiting') {
      return res.status(400).json({ message: 'This circle is no longer accepting members' });
    }

    const existing = circle.participants.find((p) => p.user.equals(req.user._id));
    if (existing) {
      return res.status(409).json({
        message:
          existing.status === 'Pending'
            ? 'Your request is already pending approval'
            : 'You are already a member of this circle',
      });
    }

    if (countByStatus(circle, 'Active') >= circle.durationMonths) {
      return res.status(400).json({ message: 'This circle is full' });
    }

    circle.participants.push({ user: req.user._id, status: 'Pending' });
    await circle.save();

    res.status(201).json({
      message: 'Join request sent. Waiting for the admin to approve.',
      circleId: circle._id,
      name: circle.name,
    });
  } catch (err) {
    handleError(res, 'Join circle error', err);
  }
};

// ---------- GET /api/circles/my  (Admin view: circles I created) ----------
exports.getMyCircles = async (req, res) => {
  try {
    const circles = await Circle.find({ creator: req.user._id }).sort('-createdAt').lean();

    const result = circles.map((c) => ({
      ...c,
      activeCount: countByStatus(c, 'Active'),
      pendingCount: countByStatus(c, 'Pending'),
    }));

    res.json({ circles: result });
  } catch (err) {
    handleError(res, 'Get my circles error', err);
  }
};

// ---------- GET /api/circles/joined  (Participant view: circles I joined) ----------
exports.getJoinedCircles = async (req, res) => {
  try {
    const circles = await Circle.find({
      creator: { $ne: req.user._id },
      'participants.user': req.user._id,
    })
      .select('-inviteCode')
      .populate('creator', 'name trustScore')
      .sort('-createdAt')
      .lean();

    const result = circles.map((c) => {
      const { participants, ...rest } = c;
      const me = participants.find((p) => p.user.equals(req.user._id));
      return {
        ...rest,
        myStatus: me.status,
        myPayoutTurn: me.payoutTurn,
        activeCount: countByStatus({ participants }, 'Active'),
      };
    });

    res.json({ circles: result });
  } catch (err) {
    handleError(res, 'Get joined circles error', err);
  }
};

// ---------- GET /api/circles/:id ----------
exports.getCircleById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: 'Circle not found' });
    }

    const circle = await Circle.findById(id);
    if (!circle) {
      return res.status(404).json({ message: 'Circle not found' });
    }

    const isAdmin = circle.creator.equals(req.user._id);
    const isMember = circle.participants.some((p) => p.user.equals(req.user._id));
    if (!isAdmin && !isMember) {
      return res.status(403).json({ message: 'You do not have access to this circle' });
    }

    await circle.populate('creator', 'name trustScore');
    await circle.populate('participants.user', isAdmin ? 'name phone trustScore' : 'name trustScore');

    const data = circle.toObject();
    if (!isAdmin) {
      delete data.inviteCode;
      // Other people's pending requests are private to the admin
      data.participants = data.participants.filter(
        (p) => p.status !== 'Pending' || p.user._id.equals(req.user._id)
      );
    }

    if (data.startDate) {
      data.participants = data.participants
        .map((p) => ({
          ...p,
          payoutDate: p.payoutTurn ? addMonths(data.startDate, p.payoutTurn - 1) : null,
        }))
        .sort((a, b) => (a.payoutTurn || 0) - (b.payoutTurn || 0));
    }

    res.json({ circle: data, role: isAdmin ? 'admin' : 'participant' });
  } catch (err) {
    handleError(res, 'Get circle error', err);
  }
};

// ---------- PATCH /api/circles/:id/participants/:userId  (Admin only) ----------
// Body: { "action": "approve" | "reject" }
exports.respondToJoinRequest = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const { action } = req.body;

    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(userId)) {
      return res.status(404).json({ message: 'Circle or user not found' });
    }
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Action must be "approve" or "reject"' });
    }

    const circle = await Circle.findById(id);
    if (!circle) {
      return res.status(404).json({ message: 'Circle not found' });
    }
    if (!circle.creator.equals(req.user._id)) {
      return res.status(403).json({ message: 'Only the circle admin can do this' });
    }
    if (circle.status !== 'Recruiting') {
      return res.status(400).json({ message: 'This circle is no longer recruiting' });
    }

    const participant = circle.participants.find((p) => p.user.equals(userId));
    if (!participant || participant.status !== 'Pending') {
      return res.status(404).json({ message: 'No pending request found for this user' });
    }

    if (action === 'approve') {
      if (countByStatus(circle, 'Active') >= circle.durationMonths) {
        return res.status(400).json({ message: 'Circle is full, cannot approve more members' });
      }
      participant.status = 'Active';
    } else {
      circle.participants = circle.participants.filter((p) => !p.user.equals(userId));
    }

    await circle.save();

    res.json({
      message: action === 'approve' ? 'Member approved' : 'Request rejected',
      activeCount: countByStatus(circle, 'Active'),
      pendingCount: countByStatus(circle, 'Pending'),
    });
  } catch (err) {
    handleError(res, 'Respond to join request error', err);
  }
};

// ---------- POST /api/circles/:id/start  (Admin only) ----------
// Body (optional): { "startDate": "2026-12-01" }
exports.startCircle = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: 'Circle not found' });
    }

    const circle = await Circle.findById(id);
    if (!circle) {
      return res.status(404).json({ message: 'Circle not found' });
    }
    if (!circle.creator.equals(req.user._id)) {
      return res.status(403).json({ message: 'Only the circle admin can start the circle' });
    }
    if (circle.status !== 'Recruiting') {
      return res.status(400).json({ message: 'This circle has already started' });
    }

    const activeCount = countByStatus(circle, 'Active');
    if (activeCount !== circle.durationMonths) {
      return res.status(400).json({
        message: `The circle needs exactly ${circle.durationMonths} active members to start (currently ${activeCount})`,
      });
    }

    let startDate = new Date();
    if (req.body.startDate) {
      startDate = new Date(req.body.startDate);
      if (isNaN(startDate.getTime())) {
        return res.status(400).json({ message: 'Invalid start date' });
      }
    }

    // Assign random payout turns 1..N to the active members
    const activeMembers = circle.participants.filter((p) => p.status === 'Active');
    shuffle(activeMembers).forEach((p, index) => {
      p.payoutTurn = index + 1;
    });

    // Drop leftover pending requests
    const removedPending = countByStatus(circle, 'Pending');
    circle.participants = circle.participants.filter((p) => p.status === 'Active');

    circle.status = 'Active';
    circle.startDate = startDate;
    await circle.save();

    await circle.populate('participants.user', 'name');

    const schedule = circle.participants
      .map((p) => ({
        turn: p.payoutTurn,
        userId: p.user._id,
        name: p.user.name,
        payoutDate: addMonths(startDate, p.payoutTurn - 1),
      }))
      .sort((a, b) => a.turn - b.turn);

    res.json({
      message: 'Circle started and payout turns assigned',
      status: circle.status,
      startDate,
      payoutPerMonth: circle.totalAmount,
      removedPendingRequests: removedPending,
      schedule,
    });
  } catch (err) {
    handleError(res, 'Start circle error', err);
  }
};