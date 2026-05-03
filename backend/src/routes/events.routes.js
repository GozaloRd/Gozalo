const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const { requireVenueAccess } = require('../middleware/venueAccess');
const eventsController = require('../controllers/events.controller');
const {
  listPublicEventsValidator,
  createPublicEventValidator,
  loginlessUpdateEventValidator,
  dashboardEventPayloadValidator,
  validateRequest,
} = require('../validators/events.validator');

const router = express.Router();

// Rutas públicas de eventos (montadas en /api/events)
router.get('/', listPublicEventsValidator, validateRequest, eventsController.listPublicEvents);
router.get('/by-id/:id', eventsController.getPublicEventById);
router.get('/slug/:slug', eventsController.getPublicEventBySlug);
router.get('/:id/tables', eventsController.getPublicEventTables);

router.post(
  '/',
  authenticate,
  requireRole('venue_owner', 'admin', 'staff'),
  createPublicEventValidator,
  validateRequest,
  eventsController.createPublicEvent
);

router.patch(
  '/:id',
  authenticate,
  requireRole('venue_owner', 'admin'),
  loginlessUpdateEventValidator,
  validateRequest,
  eventsController.updatePublicEvent
);

// Rutas dashboard/owner de eventos
router.get('/dashboard/events', authenticate, requireVenueAccess, eventsController.listDashboardEvents);
router.post(
  '/dashboard/events',
  authenticate,
  requireVenueAccess,
  dashboardEventPayloadValidator,
  validateRequest,
  eventsController.createDashboardEvent
);
router.put(
  '/dashboard/events/:id',
  authenticate,
  requireVenueAccess,
  dashboardEventPayloadValidator,
  validateRequest,
  eventsController.updateDashboardEvent
);
router.put(
  '/dashboard/events/:id/collage',
  authenticate,
  requireVenueAccess,
  eventsController.updateEventCollage
);
router.delete('/dashboard/events/:id', authenticate, requireVenueAccess, eventsController.cancelDashboardEvent);

module.exports = router;
