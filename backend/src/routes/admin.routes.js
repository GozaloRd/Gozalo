const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const adminController = require('../controllers/admin.controller');
const { updateUserRoleValidator, validateRequest } = require('../validators/admin.validator');

const router = express.Router();

router.use(authenticate, requireRole('admin'));

router.get('/dashboard', adminController.dashboard);
router.get('/venues/pending', adminController.pendingVenues);
router.get('/users', adminController.users);
router.patch('/users/:id/role', updateUserRoleValidator, validateRequest, adminController.updateUserRole);
router.delete('/users/:id', adminController.deleteUser);
router.get('/transactions', adminController.transactions);
router.get('/revenue-by-venue', adminController.revenueByVenue);
router.get('/events', adminController.events);
router.get('/events/:id/sales', adminController.eventSalesDetail);
router.get('/venues/:id/detail', adminController.venueDetail);

module.exports = router;
