const { body, validationResult } = require('express-validator');

const updateUserRoleValidator = [body('role').isIn(['customer', 'venue_owner', 'admin', 'staff'])];

function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  return next();
}

module.exports = {
  updateUserRoleValidator,
  validateRequest,
};
