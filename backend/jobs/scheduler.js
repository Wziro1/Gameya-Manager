const cron = require('node-cron');
const { runMissedPaymentCheck } = require('../services/trustService');
const { autoConfirmStalePayouts } = require('../services/payoutService');

const runDailyChecks = async () => {
  try {
    const penalties = await runMissedPaymentCheck();
    console.log(`🔎 Missed-payment check: ${penalties} penalties applied`);
  } catch (err) {
    console.error('Missed-payment check failed:', err);
  }

  try {
    const confirmed = await autoConfirmStalePayouts();
    console.log(`🔎 Payout auto-confirm: ${confirmed} payouts confirmed`);
  } catch (err) {
    console.error('Payout auto-confirm failed:', err);
  }
};

const startScheduler = () => {
  // Every day at 00:05 Cairo time
  cron.schedule('5 0 * * *', runDailyChecks, { timezone: 'Africa/Cairo' });
};

module.exports = { startScheduler, runDailyChecks };