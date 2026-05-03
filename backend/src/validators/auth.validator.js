const { body, validationResult } = require('express-validator');

const registerValidator = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('fullName').trim().notEmpty(),
];

const loginValidator = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  return next();
}

module.exports = {
  registerValidator,
  loginValidator,
  validateRequest,
};
