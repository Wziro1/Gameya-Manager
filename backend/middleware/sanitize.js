// Rejects JSON bodies containing MongoDB operators like $gt, $ne, $where
const hasOperatorKey = (value) => {
  if (Array.isArray(value)) return value.some(hasOperatorKey);
  if (value && typeof value === 'object') {
    return Object.keys(value).some((key) => key.startsWith('$') || hasOperatorKey(value[key]));
  }
  return false;
};

exports.rejectOperatorKeys = (req, res, next) => {
  if (hasOperatorKey(req.body)) {
    return res.status(400).json({ message: 'Invalid input' });
  }
  next();
};