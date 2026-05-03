const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireVenueAccess } = require('../middleware/venueAccess');
const dashboardCtrl = require('../controllers/dashboard.controller');
const eventsCtrl = require('../controllers/events.controller');
const reservationsCtrl = require('../controllers/reservations.controller');
const ticketsCtrl = require('../controllers/tickets.controller');
const posCtrl = require('../controllers/pos.controller');
const guestlistCtrl = require('../controllers/guestlist.controller');
const alertsCtrl = require('../controllers/alerts.controller');
const forecastCtrl = require('../controllers/forecast.controller');
const recurrenceCtrl = require('../controllers/recurrence.controller');
const riderCtrl = require('../controllers/rider.controller');

const router = express.Router();

router.use(authenticate);
router.use(requireVenueAccess);

router.get('/stats', dashboardCtrl.getStats);

router.get('/reservations', reservationsCtrl.listDashboardReservations);
router.get('/tickets', ticketsCtrl.listDashboardTickets);

router.get('/events', eventsCtrl.listDashboardEvents);
router.post('/events', eventsCtrl.createDashboardEvent);
router.put('/events/:id', eventsCtrl.updateDashboardEvent);
router.put('/events/:id/collage', eventsCtrl.updateEventCollage);
router.delete('/events/:id', eventsCtrl.cancelDashboardEvent);

router.get('/tables', dashboardCtrl.listDashboardTables);
router.post('/tables', dashboardCtrl.createDashboardTable);
router.put('/tables/:id', dashboardCtrl.updateDashboardTable);
router.delete('/tables/:id', dashboardCtrl.deactivateDashboardTable);

router.get('/orders/by-table', posCtrl.ordersByTable);
router.get('/orders', posCtrl.listDashboardOrders);
router.post('/orders', posCtrl.createDashboardOrder);
router.post('/orders/:orderId/items', posCtrl.addDashboardOrderItems);
router.post('/orders/:orderId/close', posCtrl.closeDashboardOrder);

router.get('/staff/sales', dashboardCtrl.staffSales);
router.get('/staff', dashboardCtrl.listStaff);
router.post('/staff', dashboardCtrl.addStaff);
router.delete('/staff/:id', dashboardCtrl.removeStaff);

router.get('/reports', dashboardCtrl.getReports);
router.get('/analytics', dashboardCtrl.getAnalytics);

router.get('/cash-closing', dashboardCtrl.listCashClosings);
router.post('/cash-closing', dashboardCtrl.createCashClosing);

// Guestlist VIP / cortesías por evento
router.get('/events/:eventId/guestlist', guestlistCtrl.list);
router.post('/events/:eventId/guestlist', guestlistCtrl.create);
router.put('/events/:eventId/guestlist/:id', guestlistCtrl.update);
router.delete('/events/:eventId/guestlist/:id', guestlistCtrl.remove);

// Oleada 2: Alertas operativas en tiempo real
router.get('/alerts', alertsCtrl.listAlerts);

// Oleada 2: Forecast de ingresos por evento
router.get('/events/:eventId/forecast', forecastCtrl.eventForecast);

// Oleada 2: Series recurrentes (plantilla semanal)
router.get('/recurrences', recurrenceCtrl.list);
router.post('/recurrences/weekly', recurrenceCtrl.createWeekly);

// Oleada 3: Rider técnico + setlist + WhatsApp staff
router.get('/events/:eventId/rider', riderCtrl.get);
router.put('/events/:eventId/rider', riderCtrl.update);
router.post('/events/:eventId/rider/files', riderCtrl.addFile);
router.delete('/events/:eventId/rider/files', riderCtrl.removeFile);

module.exports = router;
