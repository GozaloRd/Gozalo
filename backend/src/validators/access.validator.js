const { body, validationResult } = require('express-validator');

const scanValidator = [body('payload').trim().notEmpty(), body('eventId').isUUID()];

function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  return next();
}

module.exports = {
  scanValidator,
  validateRequest,
};
