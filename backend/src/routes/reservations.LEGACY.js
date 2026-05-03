/**
 * ⚠️ ARCHIVO LEGACY - NO USAR
 *
 * Este archivo fue reemplazado por:
 * - routes/reservations.routes.js
 */
const express = require('express');
const { body, validationResult } = require('express-validator');
const { Reservation, Event, VenueTable, Venue, User } = require('../models');
const { authenticate, requireRole } = require('../middleware/auth');
const { createPayload, generateQrPng } = require('../services/qrService');
const { sendReservationConfirmation } = require('../services/emailService');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

router.post(
  '/',
  authenticate,
  [
    body('eventId').isUUID(),
    body('tableId').isUUID(),
    body('partySize').isInt({ min: 1 }),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const event = await Event.findByPk(req.body.eventId, { include: [{ model: Venue, as: 'venue' }] });
    if (!event || event.status !== 'published') {
      return res.status(400).json({ error: 'Evento no disponible' });
    }
    const table = await VenueTable.findByPk(req.body.tableId);
    if (!table || table.venueId !== event.venueId) {
      return res.status(400).json({ error: 'Mesa inválida' });
    }
    if (table.eventId && table.eventId !== event.id) {
      return res.status(400).json({ error: 'Mesa no asignada a este evento' });
    }
    const minDeposit = Number(req.body.minDeposit || 500);
    const totalAmount = minDeposit;
    const qrPayload = createPayload('res');
    const reservation = await Reservation.create({
      userId: req.userId,
      eventId: event.id,
      tableId: table.id,
      partySize: req.body.partySize,
      totalAmount,
      status: 'pending',
      qrPayload,
      notes: req.body.notes,
    });
    const qrImage = await generateQrPng(qrPayload);
    await sendReservationConfirmation(req.user.email, {
      name: req.user.fullName,
      eventTitle: event.title,
      venueName: event.venue.name,
      status: reservation.status,
      tableLabel: `${table.zone} ${table.label}`,
      partySize: reservation.partySize,
      total: totalAmount,
    }).catch(() => {});
    res.status(201).json({ reservation, qrImage });
  })
);

router.get(
  '/my',
  authenticate,
  asyncHandler(async (req, res) => {
    const list = await Reservation.findAll({
      where: { userId: req.userId },
      include: [
        { model: Event, as: 'event', include: [{ model: Venue, as: 'venue' }] },
        { model: VenueTable, as: 'table' },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json(list);
  })
);

router.get(
  '/venue/:venueId',
  authenticate,
  requireRole('venue_owner', 'admin', 'staff'),
  asyncHandler(async (req, res) => {
    const venue = await Venue.findByPk(req.params.venueId);
    if (!venue) return res.status(404).json({ error: 'Local no encontrado' });
    if (req.user.role !== 'admin' && venue.ownerId !== req.userId) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    const rows = await Reservation.findAll({
      include: [
        {
          model: Event,
          as: 'event',
          where: { venueId: venue.id },
          required: true,
        },
        { model: User, as: 'user', attributes: ['id', 'email', 'fullName', 'phone'] },
        { model: VenueTable, as: 'table' },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json(rows);
  })
);

router.patch(
  '/:id/status',
  authenticate,
  requireRole('venue_owner', 'admin', 'staff'),
  [
    body('status').isIn([
      'pending',
      'confirmed',
      'checked_in',
      'cancelled',
      'completed',
      'no_show',
    ]),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const reservation = await Reservation.findByPk(req.params.id, {
      include: [{ model: Event, as: 'event', include: [{ model: Venue, as: 'venue' }] }],
    });
    if (!reservation) return res.status(404).json({ error: 'No encontrado' });
    const venue = reservation.event.venue;
    if (req.user.role !== 'admin' && venue.ownerId !== req.userId) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    reservation.status = req.body.status;
    if (req.body.status === 'checked_in' && !reservation.checkedInAt) {
      reservation.checkedInAt = new Date();
    }
    await reservation.save();
    res.json(reservation);
  })
);

router.patch(
  '/:id/confirm-payment',
  authenticate,
  asyncHandler(async (req, res) => {
    const reservation = await Reservation.findByPk(req.params.id);
    if (!reservation || reservation.userId !== req.userId) {
      return res.status(404).json({ error: 'No encontrado' });
    }
    reservation.status = 'confirmed';
    await reservation.save();
    res.json(reservation);
  })
);

/** El dueño de la reserva cancela (solo pendiente). */
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const reservation = await Reservation.findByPk(req.params.id);
    if (!reservation || reservation.userId !== req.userId) {
      return res.status(404).json({ error: 'No encontrado' });
    }
    if (reservation.status !== 'pending') {
      return res.status(400).json({ error: 'Solo se pueden cancelar reservas pendientes' });
    }
    reservation.status = 'cancelled';
    await reservation.save();
    res.json({ ok: true, reservation });
  })
);

module.exports = router;
