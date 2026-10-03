class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function errorHandler(err, req, res, _next) {
  let status = err.status || 500;
  let message = err.message;
  if (err.code === 11000) {
    status = 409;
    message = 'Username or email already taken.';
  } else if (err.name === 'VersionError') {
    status = 409;
    message = 'This item changed while you were editing. Refresh and try again.';
  } else if (['ValidationError', 'CastError', 'MulterError'].includes(err.name)) {
    status = 400;
    message = 'Invalid input or upload. Check the field and file limits.';
  }
  if (status >= 500) {
    // Do not log request bodies, credentials, session IDs, or database connection strings.
    console.error(JSON.stringify({ event: 'request_failed', requestId: req.id, name: err.name }));
    message = 'Something went wrong. Please try again later.';
  }
  if (req.accepts(['html', 'json']) === 'html' && req.method === 'GET') {
    return res.status(status).render('error', { status, message });
  }
  return res.status(status).json({ success: false, message, requestId: req.id });
}

module.exports = { HttpError, errorHandler };
