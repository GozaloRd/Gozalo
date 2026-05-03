const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const { requireVenueAccess } = require('../middleware/venueAccess');
const reservationsController = require('../controllers/reservations.controller');
const {
  createReservationValidator,
  updateReservationStatusValidator,
  listDashboardReservationsValidator,
  validateRequest,
} = require('../validators/reservations.validator');

const router = express.Router();

router.post('/', authenticate, createReservationValidator, validateRequest, reservationsController.createReservation);
router.get('/my', authenticate, reservationsController.listMyReservations);
router.get(
  '/venue/:venueId',
  authenticate,
  requireRole('venue_owner', 'admin', 'staff'),
  reservationsController.listReservationsByVenue
);
router.patch(
  '/:id/status',
  authenticate,
  requireRole('venue_owner', 'admin', 'staff'),
  updateReservationStatusValidator,
  validateRequest,
  reservationsController.updateReservationStatus
);
router.patch('/:id/confirm-payment', authenticate, reservationsController.confirmReservationPayment);
router.delete('/:id', authenticate, reservationsController.cancelMyReservation);

router.get(
  '/dashboard/list',
  authenticate,
  requireVenueAccess,
  listDashboardReservationsValidator,
  validateRequest,
  reservationsController.listDashboardReservations
);

module.exports = router;
