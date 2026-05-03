const express = require('express');
const { authenticate } = require('../middleware/auth');
const uploadController = require('../controllers/upload.controller');

const router = express.Router();

router.post('/image', authenticate, uploadController.uploadSingle);
router.post('/images', authenticate, uploadController.uploadMultiple);

module.exports = router;
