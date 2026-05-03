/**
 * ⚠️ ARCHIVO LEGACY - NO USAR
 *
 * Este archivo fue reemplazado por:
 * - routes/auth.routes.js
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { User } = require('../models');
const { signAccessToken } = require('../utils/authTokens');
const { authenticate } = require('../middleware/auth');
const { sendWelcome } = require('../services/emailService');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('fullName').trim().notEmpty(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { email, password, fullName, phone, role } = req.body;
    const exists = await User.findOne({ where: { email } });
    if (exists) {
      return res.status(409).json({ error: 'El correo ya está registrado' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const allowedRoles = ['customer', 'venue_owner'];
    const user = await User.create({
      email,
      passwordHash,
      fullName,
      phone: phone || null,
      role: allowedRoles.includes(role) ? role : 'customer',
    });
    await sendWelcome(email, fullName).catch(() => {});
    const token = signAccessToken(user);
    return res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        points: user.points,
      },
    });
  })
);

router.post(
  '/login',
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    const token = signAccessToken(user);
    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        points: user.points,
      },
    });
  })
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const u = req.user;
    return res.json({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      phone: u.phone,
      role: u.role,
      points: u.points,
      avatarUrl: u.avatarUrl,
    });
  })
);

router.patch(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const u = await User.findByPk(req.userId);
    if (!u) return res.status(404).json({ error: 'No encontrado' });
    const { fullName, phone, avatarUrl } = req.body;
    if (fullName != null && String(fullName).trim()) u.fullName = String(fullName).trim();
    if (phone !== undefined) u.phone = phone || null;
    if (avatarUrl !== undefined) u.avatarUrl = avatarUrl || null;
    await u.save();
    return res.json({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      phone: u.phone,
      role: u.role,
      points: u.points,
      avatarUrl: u.avatarUrl,
    });
  })
);

module.exports = router;
