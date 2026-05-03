const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const { requireVenueAccess } = require('../middleware/venueAccess');
const posController = require('../controllers/pos.controller');
const {
  createProductValidator,
  createOrderValidator,
  addOrderItemValidator,
  payOrderValidator,
  validateRequest,
} = require('../validators/pos.validator');

const router = express.Router();

router.get('/products/:venueId', authenticate, requireRole('venue_owner', 'admin', 'staff'), posController.listProducts);
router.post(
  '/products',
  authenticate,
  requireRole('venue_owner', 'admin'),
  createProductValidator,
  validateRequest,
  posController.createProduct
);

router.post(
  '/orders',
  authenticate,
  requireRole('venue_owner', 'admin', 'staff'),
  createOrderValidator,
  validateRequest,
  posController.createOrder
);

router.post(
  '/orders/:orderId/items',
  authenticate,
  requireRole('venue_owner', 'admin', 'staff'),
  addOrderItemValidator,
  validateRequest,
  posController.addOrderItems
);

router.post(
  '/orders/:orderId/pay',
  authenticate,
  requireRole('venue_owner', 'admin', 'staff'),
  payOrderValidator,
  validateRequest,
  posController.payOrder
);

router.get('/orders/open/:venueId', authenticate, requireRole('venue_owner', 'admin', 'staff'), posController.listOpenOrders);

router.get('/dashboard/orders/by-table', authenticate, requireVenueAccess, posController.ordersByTable);
router.get('/dashboard/orders', authenticate, requireVenueAccess, posController.listDashboardOrders);
router.post('/dashboard/orders', authenticate, requireVenueAccess, posController.createDashboardOrder);
router.post('/dashboard/orders/:orderId/items', authenticate, requireVenueAccess, posController.addDashboardOrderItems);
router.post('/dashboard/orders/:orderId/close', authenticate, requireVenueAccess, posController.closeDashboardOrder);

module.exports = router;
