const express = require('express');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/split.controller');

const router = express.Router();

// Público: ver split por token (para que el amigo vea cuánto debe)
router.get('/token/:token', ctrl.getByToken);

// Autenticados
router.post('/', authenticate, ctrl.createSplit);
router.post('/token/:token/pay', authenticate, ctrl.payShare);
router.get('/my', authenticate, ctrl.mySplits);

module.exports = router;
