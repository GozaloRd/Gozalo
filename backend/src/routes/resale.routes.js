const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const { requireVenueAccess } = require('../middleware/venueAccess');
const ctrl = require('../controllers/resale.controller');

const router = express.Router();

// Público: ver entradas en reventa de un evento
router.get('/events/:eventId', ctrl.listEventResales);

// Usuario: gestión propia
router.get('/my/listings',  authenticate, ctrl.myListings);
router.get('/my/purchases', authenticate, ctrl.myPurchases);
router.post('/list',        authenticate, ctrl.listForResale);
router.delete('/:id',       authenticate, ctrl.cancelListing);
router.post('/:id/claim',   authenticate, ctrl.claimResale);

// Dashboard (venue owner / admin): pagos pendientes al vendedor
router.get(
  '/dashboard/payouts',
  authenticate,
  requireVenueAccess,
  ctrl.listPendingPayouts
);
router.patch(
  '/dashboard/payouts/:id/paid',
  authenticate,
  requireRole('venue_owner', 'admin'),
  ctrl.markSellerPaid
);

module.exports = router;
