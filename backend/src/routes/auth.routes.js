const express = require('express');
const { authenticate } = require('../middleware/auth');
const authController = require('../controllers/auth.controller');
const {
  registerValidator,
  loginValidator,
  validateRequest,
} = require('../validators/auth.validator');

const router = express.Router();

router.post('/register', registerValidator, validateRequest, authController.register);
router.post('/login', loginValidator, validateRequest, authController.login);
router.get('/me', authenticate, authController.me);
router.patch('/me', authenticate, authController.updateMe);

module.exports = router;
