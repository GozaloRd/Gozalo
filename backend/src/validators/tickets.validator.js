const { body, query, validationResult } = require('express-validator');

const purchaseTicketsValidator = [
  body('eventId').isUUID(),
  body('items').isArray({ min: 1 }),
  body('items.*.ticketType').trim().notEmpty(),
  body('items.*.quantity').isInt({ min: 1 }),
  body('items.*.unitPrice').isFloat({ min: 0 }),
];

const listDashboardTicketsValidator = [
  query('eventId').optional().isUUID(),
  query('status').optional().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('pageSize').optional().isInt({ min: 1, max: 100 }),
];

function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  return next();
}

module.exports = {
  purchaseTicketsValidator,
  listDashboardTicketsValidator,
  validateRequest,
};
