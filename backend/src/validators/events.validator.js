const { body, query, validationResult } = require('express-validator');

const listPublicEventsValidator = [
  query('city').optional().trim(),
  query('category').optional().trim(),
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  query('featured').optional(),
  query('featuredOnly').optional(),
  query('excludeFeatured').optional(),
  query('past').optional(),
  query('status').optional().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('pageSize').optional().isInt({ min: 1, max: 200 }),
];

const createPublicEventValidator = [
  body('venueId').isUUID(),
  body('title').trim().notEmpty(),
  body('category').trim().notEmpty(),
  body('city').trim().notEmpty(),
  body('startAt').isISO8601(),
  body('endAt').isISO8601(),
];

const loginlessUpdateEventValidator = [];

const dashboardEventPayloadValidator = [
  body('startAt').optional().isISO8601(),
  body('endAt').optional().isISO8601(),
];

function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  return next();
}

module.exports = {
  listPublicEventsValidator,
  createPublicEventValidator,
  loginlessUpdateEventValidator,
  dashboardEventPayloadValidator,
  validateRequest,
};
