// Adds months without overflowing (Jan 31 + 1 month => Feb 28/29)
const addMonths = (date, n) => {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d;
};

const endOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

// Due date of month N (month 1 is due on the start date)
const getDueDate = (startDate, monthNumber) => addMonths(startDate, monthNumber - 1);

// How many months have already come due
const getCurrentMonth = (startDate, durationMonths, now = new Date()) => {
  let count = 0;
  while (count < durationMonths && addMonths(startDate, count) <= now) count++;
  return count;
};

module.exports = { addMonths, endOfDay, getDueDate, getCurrentMonth };