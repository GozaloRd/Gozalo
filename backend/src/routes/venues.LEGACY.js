/**
 * ⚠️ ARCHIVO LEGACY - NO USAR
 *
 * Este archivo fue reemplazado por:
 * - routes/venues.routes.js
 */
const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { Venue, User, Event, VenueTable } = require('../models');
const { authenticate, requireRole } = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');

const router = express.Router();

function slugify(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

router.get(
  '/mine',
  authenticate,
  requireRole('venue_owner', 'admin'),
  dashboardController.getMineVenue
);

router.get(
  '/mine/list',
  authenticate,
  requireRole('venue_owner', 'admin'),
  async (req, res) => {
    const venues = await Venue.findAll({
      where: req.user.role === 'admin' ? {} : { ownerId: req.userId },
      include: [{ model: Event, as: 'events', required: false }],
    });
    res.json(venues);
  }
);

router.get(
  '/',
  [query('city').optional().trim(), query('status').optional()],
  async (req, res) => {
    const where = {};
    if (req.query.city) where.city = req.query.city;
    if (req.query.status) where.status = req.query.status;
    else where.status = 'approved';
    const venues = await Venue.findAll({
      where,
      include: [{ model: User, as: 'owner', attributes: ['id', 'fullName'] }],
      order: [['name', 'ASC']],
    });
    res.json(venues);
  }
);

router.get('/:id/tables', async (req, res) => {
  const venue = await Venue.findByPk(req.params.id);
  if (!venue) return res.status(404).json({ error: 'Local no encontrado' });
  const tables = await VenueTable.findAll({
    where: { venueId: venue.id, eventId: null },
    order: [['zone', 'ASC'], ['label', 'ASC']],
  });
  res.json(tables);
});

router.post(
  '/:id/tables',
  authenticate,
  requireRole('venue_owner', 'admin'),
  async (req, res) => {
    const venue = await Venue.findByPk(req.params.id);
    if (!venue) return res.status(404).json({ error: 'No encontrado' });
    if (req.user.role !== 'admin' && venue.ownerId !== req.userId) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    const t = await VenueTable.create({
      venueId: venue.id,
      eventId: req.body.eventId || null,
      zone: req.body.zone || 'General',
      label: req.body.label,
      capacity: req.body.capacity || 4,
      minPrice: req.body.minPrice ?? null,
      posX: req.body.posX ?? 0,
      posY: req.body.posY ?? 0,
      active: req.body.active !== false,
    });
    res.status(201).json(t);
  }
);

router.patch(
  '/:venueId/tables/:tableId',
  authenticate,
  requireRole('venue_owner', 'admin'),
  async (req, res) => {
    const venue = await Venue.findByPk(req.params.venueId);
    if (!venue) return res.status(404).json({ error: 'No encontrado' });
    if (req.user.role !== 'admin' && venue.ownerId !== req.userId) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    const table = await VenueTable.findOne({
      where: { id: req.params.tableId, venueId: venue.id },
    });
    if (!table) return res.status(404).json({ error: 'Mesa no encontrada' });
    const keys = ['zone', 'label', 'capacity', 'minPrice', 'posX', 'posY', 'active', 'eventId'];
    for (const k of keys) {
      if (req.body[k] !== undefined) table[k] = req.body[k];
    }
    await table.save();
    res.json(table);
  }
);

router.get('/:id', async (req, res) => {
  const venue = await Venue.findByPk(req.params.id, {
    include: [
      { model: User, as: 'owner', attributes: ['id', 'fullName'] },
      {
        model: Event,
        as: 'events',
        where: { status: 'published' },
        required: false,
        limit: 20,
      },
    ],
  });
  if (!venue) return res.status(404).json({ error: 'Local no encontrado' });
  res.json(venue);
});

router.post(
  '/',
  authenticate,
  requireRole('venue_owner', 'admin'),
  [
    body('name').trim().notEmpty(),
    body('city').trim().notEmpty(),
    body('description').optional(),
    body('address').optional(),
    body('capacity').optional().isInt(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const base = slugify(req.body.name);
    let slug = base;
    let n = 1;
    while (await Venue.findOne({ where: { slug } })) {
      slug = `${base}-${n++}`;
    }
    const venue = await Venue.create({
      ownerId: req.user.role === 'admin' ? req.body.ownerId || req.userId : req.userId,
      name: req.body.name,
      slug,
      description: req.body.description,
      city: req.body.city,
      address: req.body.address,
      capacity: req.body.capacity || 0,
      status: req.user.role === 'admin' ? 'approved' : 'pending',
    });
    res.status(201).json(venue);
  }
);

router.patch(
  '/:id',
  authenticate,
  async (req, res) => {
    const venue = await Venue.findByPk(req.params.id);
    if (!venue) return res.status(404).json({ error: 'No encontrado' });
    if (req.user.role !== 'admin' && venue.ownerId !== req.userId) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    const allowed = ['name', 'description', 'city', 'address', 'capacity', 'coverImageUrl'];
    for (const k of allowed) {
      if (req.body[k] !== undefined) venue[k] = req.body[k];
    }
    await venue.save();
    res.json(venue);
  }
);

router.patch(
  '/:id/status',
  authenticate,
  requireRole('admin'),
  [body('status').isIn(['pending', 'approved', 'rejected', 'suspended'])],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const venue = await Venue.findByPk(req.params.id);
    if (!venue) return res.status(404).json({ error: 'No encontrado' });
    venue.status = req.body.status;
    await venue.save();
    res.json(venue);
  }
);

module.exports = router;
