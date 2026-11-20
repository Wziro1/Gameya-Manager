const TrustEvent = require('../models/TrustEvent');
const { RULES, LEVELS, MIN_SCORE, MAX_SCORE, REJECTED_GRACE_DAYS } = require('../config/trustRules');
const { getTrustLevel } = require('../services/trustService');

// GET /api/trust/me  (score, level and history for the logged-in user)
exports.getMyTrust = async (req, res) => {
  try {
    const events = await TrustEvent.find({ user: req.user._id })
      .sort('-createdAt')
      .limit(30)
      .populate('circle', 'name')
      .lean();

    res.json({
      trustScore: req.user.trustScore,
      level: getTrustLevel(req.user.trustScore),
      history: events.map((e) => ({
        id: e._id,
        type: e.type,
        label: RULES[e.type].label,
        delta: e.delta,
        scoreBefore: e.scoreBefore,
        scoreAfter: e.scoreAfter,
        circle: e.circle ? e.circle.name : null,
        monthNumber: e.monthNumber,
        createdAt: e.createdAt,
      })),
    });
  } catch (err) {
    console.error('Get trust error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/trust/rules  (for a "how does my score work?" screen)
exports.getRules = (req, res) => {
  res.json({
    min: MIN_SCORE,
    max: MAX_SCORE,
    rules: RULES,
    levels: LEVELS,
    rejectedGraceDays: REJECTED_GRACE_DAYS,
  });
};