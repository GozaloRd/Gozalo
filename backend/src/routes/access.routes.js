const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const accessController = require('../controllers/access.controller');
const { scanValidator, validateRequest } = require('../validators/access.validator');

const router = express.Router();

router.post('/scan', authenticate, requireRole('venue_owner', 'admin', 'staff'), scanValidator, validateRequest, accessController.scan);
router.get('/occupancy/:eventId', authenticate, requireRole('venue_owner', 'admin', 'staff'), accessController.occupancy);

module.exports = router;
