const { body, query, validationResult } = require('express-validator');

const listVenuesValidator = [
  query('city').optional().trim(),
  query('status').optional(),
];

const createVenueValidator = [
  body('name').trim().notEmpty(),
  body('city').trim().notEmpty(),
  body('description').optional(),
  body('address').optional(),
  body('capacity').optional().isInt(),
];

const updateVenueStatusValidator = [
  body('status').isIn(['pending', 'approved', 'rejected', 'suspended']),
];

function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  return next();
}

module.exports = {
  listVenuesValidator,
  createVenueValidator,
  updateVenueStatusValidator,
  validateRequest,
};
