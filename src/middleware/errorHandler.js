// Express error-handling middleware. Must be registered last, after all routes.
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({ error: 'internal_error' });
}

module.exports = { errorHandler };
