const { body, validationResult } = require('express-validator');

const createProductValidator = [
  body('venueId').isUUID(),
  body('name').trim().notEmpty(),
  body('category').trim().notEmpty(),
  body('price').isFloat({ min: 0 }),
];

const createOrderValidator = [
  body('venueId').isUUID(),
  body('tableId').optional().isUUID(),
  body('eventId').optional().isUUID(),
];

const addOrderItemValidator = [
  body('productId').isUUID(),
  body('quantity').isInt({ min: 1 }),
];

const payOrderValidator = [body('method').isIn(['cash', 'card', 'transfer', 'other'])];

function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  return next();
}

module.exports = {
  createProductValidator,
  createOrderValidator,
  addOrderItemValidator,
  payOrderValidator,
  validateRequest,
};
