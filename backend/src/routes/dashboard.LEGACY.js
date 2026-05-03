/**
 * ⚠️ ARCHIVO LEGACY - NO USAR
 *
 * Este archivo fue reemplazado por:
 * - routes/dashboard.routes.js
 */
const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireVenueAccess } = require('../middleware/venueAccess');
const ctrl = require('../controllers/dashboardController');

const router = express.Router();

router.use(authenticate);
router.use(requireVenueAccess);

router.get('/stats', ctrl.getStats);

router.get('/reservations', ctrl.listReservations);
router.get('/tickets', ctrl.listTickets);

router.get('/events', ctrl.listDashboardEvents);
router.post('/events', ctrl.createDashboardEvent);
router.put('/events/:id', ctrl.updateDashboardEvent);
router.delete('/events/:id', ctrl.cancelDashboardEvent);

router.get('/tables', ctrl.listDashboardTables);
router.post('/tables', ctrl.createDashboardTable);
router.put('/tables/:id', ctrl.updateDashboardTable);
router.delete('/tables/:id', ctrl.deactivateDashboardTable);

router.get('/orders/by-table', ctrl.ordersByTable);
router.get('/orders', ctrl.listDashboardOrders);
router.post('/orders', ctrl.createDashboardOrder);
router.post('/orders/:orderId/items', ctrl.addDashboardOrderItems);
router.post('/orders/:orderId/close', ctrl.closeDashboardOrder);

router.get('/staff/sales', ctrl.staffSales);
router.get('/staff', ctrl.listStaff);
router.post('/staff', ctrl.addStaff);
router.delete('/staff/:id', ctrl.removeStaff);

router.get('/reports', ctrl.getReports);

router.get('/cash-closing', ctrl.listCashClosings);
router.post('/cash-closing', ctrl.createCashClosing);

module.exports = router;
