/**
 * ⚠️ ARCHIVO LEGACY - NO USAR
 *
 * Este archivo fue reemplazado por:
 * - routes/admin.routes.js
 */
const express = require('express');
const { Op } = require('sequelize');
const { User, Venue, Payment, Order, Reservation } = require('../models');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, requireRole('admin'));

router.get('/dashboard', async (req, res) => {
  const [users, venuesPending, venuesApproved, paymentsSum] = await Promise.all([
    User.count(),
    Venue.count({ where: { status: 'pending' } }),
    Venue.count({ where: { status: 'approved' } }),
    Payment.sum('amount', { where: { status: 'completed' } }),
  ]);
  const commissionSum = await Payment.sum('commissionAmount', { where: { status: 'completed' } });
  res.json({
    totalUsers: users,
    venuesPending,
    venuesApproved,
    totalVolumeRD: paymentsSum || 0,
    platformCommissionsRD: commissionSum || 0,
  });
});

router.get('/venues/pending', async (req, res) => {
  const list = await Venue.findAll({
    where: { status: 'pending' },
    include: [{ model: User, as: 'owner', attributes: ['id', 'email', 'fullName', 'phone'] }],
  });
  res.json(list);
});

router.get('/users', async (req, res) => {
  const users = await User.findAll({
    attributes: ['id', 'email', 'fullName', 'phone', 'role', 'points', 'createdAt'],
    order: [['createdAt', 'DESC']],
    limit: 500,
  });
  res.json(users);
});

router.patch('/users/:id/role', async (req, res) => {
  const u = await User.findByPk(req.params.id);
  if (!u) return res.status(404).json({ error: 'No encontrado' });
  if (['customer', 'venue_owner', 'admin', 'staff'].includes(req.body.role)) {
    u.role = req.body.role;
    await u.save();
  }
  res.json(u);
});

router.get('/transactions', async (req, res) => {
  const payments = await Payment.findAll({
    where: { status: 'completed' },
    include: [
      { model: Order, as: 'order', required: false },
      { model: Reservation, as: 'reservation', required: false },
    ],
    order: [['createdAt', 'DESC']],
    limit: 200,
  });
  res.json(payments);
});

module.exports = router;
