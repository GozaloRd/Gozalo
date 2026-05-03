const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireVenueAccess } = require('../middleware/venueAccess');
const ticketsController = require('../controllers/tickets.controller');
const {
  purchaseTicketsValidator,
  listDashboardTicketsValidator,
  validateRequest,
} = require('../validators/tickets.validator');

const router = express.Router();

router.post('/purchase', authenticate, purchaseTicketsValidator, validateRequest, ticketsController.purchaseTickets);
router.get('/my', authenticate, ticketsController.listMyTickets);

router.get(
  '/dashboard/list',
  authenticate,
  requireVenueAccess,
  listDashboardTicketsValidator,
  validateRequest,
  ticketsController.listDashboardTickets
);

module.exports = router;
