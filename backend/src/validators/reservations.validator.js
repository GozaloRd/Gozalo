const { body, query, validationResult } = require('express-validator');

const createReservationValidator = [
  body('eventId').isUUID(),
  body('tableId').isUUID(),
  body('partySize').isInt({ min: 1 }),
  body('paymentOption').optional().isIn(['total', 'partial']),
  body('upfrontPercent').optional().isFloat({ min: 1, max: 100 }),
  body('cover.ticketType').optional().isString().isLength({ min: 1, max: 120 }),
  body('cover.quantity').optional().isInt({ min: 1, max: 100 }),
  body('cover.unitPrice').optional().isFloat({ min: 0 }),
  body('buyerEmail').optional({ values: 'falsy' }).isEmail(),
  body('buyerFullName').optional({ values: 'falsy' }).trim().isLength({ min: 1, max: 160 }),
];

const updateReservationStatusValidator = [
  body('status').isIn([
    'pending',
    'confirmed',
    'checked_in',
    'cancelled',
    'completed',
    'no_show',
  ]),
];

const listDashboardReservationsValidator = [
  query('eventId').optional().isUUID(),
  query('status').optional().trim(),
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  query('sort').optional().isIn(['asc', 'desc']),
  query('page').optional().isInt({ min: 1 }),
  query('pageSize').optional().isInt({ min: 1, max: 100 }),
];

function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  return next();
}

module.exports = {
  createReservationValidator,
  updateReservationStatusValidator,
  listDashboardReservationsValidator,
  validateRequest,
};
