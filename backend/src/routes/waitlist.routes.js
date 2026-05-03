const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireVenueAccess } = require('../middleware/venueAccess');
const ctrl = require('../controllers/waitlist.controller');

const router = express.Router();

// usuario
router.post('/events/:eventId/join', authenticate, ctrl.join);
router.delete('/events/:eventId/leave', authenticate, ctrl.leave);
router.get('/events/:eventId/mine', authenticate, ctrl.mine);

// venue owner / staff
router.get('/events/:eventId', authenticate, requireVenueAccess, ctrl.listForEvent);
router.post('/events/:eventId/notify-next', authenticate, requireVenueAccess, ctrl.notifyNext);

module.exports = router;
