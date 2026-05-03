const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const venuesController = require('../controllers/venues.controller');
const {
  listVenuesValidator,
  createVenueValidator,
  updateVenueStatusValidator,
  validateRequest,
} = require('../validators/venues.validator');

const router = express.Router();

router.get(
  '/mine',
  authenticate,
  requireRole('venue_owner', 'admin'),
  venuesController.getMineVenue
);

router.get(
  '/mine/list',
  authenticate,
  requireRole('venue_owner', 'admin'),
  venuesController.listMineVenues
);

router.get('/', listVenuesValidator, validateRequest, venuesController.listVenues);

router.get('/:id/tables', venuesController.getVenueTables);

router.post(
  '/:id/tables',
  authenticate,
  requireRole('venue_owner', 'admin'),
  venuesController.createVenueTable
);

router.patch(
  '/:venueId/tables/:tableId',
  authenticate,
  requireRole('venue_owner', 'admin'),
  venuesController.updateVenueTable
);

router.get('/:id', venuesController.getVenueById);

router.post(
  '/',
  authenticate,
  requireRole('venue_owner', 'admin'),
  createVenueValidator,
  validateRequest,
  venuesController.createVenue
);

router.patch('/:id', authenticate, venuesController.updateVenue);

router.patch(
  '/:id/status',
  authenticate,
  requireRole('admin'),
  updateVenueStatusValidator,
  validateRequest,
  venuesController.updateVenueStatus
);

module.exports = router;
