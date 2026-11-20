const money = new Intl.NumberFormat('en-EG', {
  style: 'currency',
  currency: 'EGP',
  maximumFractionDigits: 0,
});

export const formatMoney = (n) => money.format(n);

export const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export const firstName = (name = '') => name.trim().split(' ')[0];

export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export const trustTone = (score) =>
  score >= 90 ? 'green' : score >= 75 ? 'blue' : score >= 50 ? 'amber' : 'red';

export const formatShortDate = (d) =>
  new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });