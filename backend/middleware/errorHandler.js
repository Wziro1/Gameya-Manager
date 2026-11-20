exports.notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

// Express recognizes error handlers by their 4 parameters
exports.errorHandler = (err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid JSON in request body' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request body too large' });
  }

  console.error('Unhandled error:', err);
  const status = err.status && err.status < 500 ? err.status : 500;
  res.status(status).json({ message: status === 500 ? 'Server error' : err.message });
};