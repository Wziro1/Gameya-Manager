module.exports = {
  MIN_SCORE: 0,
  MAX_SCORE: 100,

  RULES: {
    OnTimePayment: { delta: 2, label: 'Verified on-time payment' },
    LatePayment: { delta: -3, label: 'Verified late payment' },
    MissedPayment: { delta: -10, label: 'Missed payment' },
  },

  // A rejected receipt that isn't fixed within this many days counts as missed
  REJECTED_GRACE_DAYS: 3,

  // Highest first
  LEVELS: [
    { min: 90, label: 'Excellent' },
    { min: 75, label: 'Good' },
    { min: 50, label: 'Fair' },
    { min: 0, label: 'Low' },
  ],
};