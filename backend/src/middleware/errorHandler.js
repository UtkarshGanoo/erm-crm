const { validationResult } = require('express-validator');

// Call at the top of any controller after express-validator rules run
function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
    return true; // means "stop, error was sent"
  }
  return false;
}

// Global error handler - registered last in server.js
function errorHandler(err, req, res, next) {
  console.error(err);

  // Postgres unique violation
  if (err.code === '23505') {
    return res.status(409).json({ success: false, message: 'Duplicate entry: record already exists' });
  }
  // Postgres foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({ success: false, message: 'Invalid reference: related record not found' });
  }

  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error',
  });
}

function notFound(req, res) {
  res.status(404).json({ success: false, message: 'Route not found' });
}

module.exports = { handleValidation, errorHandler, notFound };
