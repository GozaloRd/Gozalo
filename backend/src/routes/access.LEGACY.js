/**
 * ⚠️ ARCHIVO LEGACY - NO USAR
 *
 * Este archivo fue reemplazado por:
 * - routes/access.routes.js
 */
const express = require('express');
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { Reservation, Ticket, Event, AccessLog, Venue } = require('../models');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.post(
  '/scan',
  authenticate,
  requireRole('venue_owner', 'admin', 'staff'),
  [body('payload').trim().notEmpty(), body('eventId').isUUID()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const event = await Event.findByPk(req.body.eventId, { include: [{ model: Venue, as: 'venue' }] });
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' });
    if (req.user.role !== 'admin' && event.venue.ownerId !== req.userId) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    const payload = req.body.payload;
    let reservation = await Reservation.findOne({
      where: { qrPayload: payload, eventId: event.id },
    });
    let ticket = await Ticket.findOne({
      where: { qrPayload: payload, eventId: event.id },
    });
    let success = false;
    let message = 'Código no válido';
    if (reservation) {
      if (['confirmed', 'checked_in', 'completed'].includes(reservation.status)) {
        success = true;
        message = 'Reserva OK';
      } else {
        message = `Reserva ${reservation.status}`;
      }
      await AccessLog.create({
        eventId: event.id,
        reservationId: reservation.id,
        ticketId: null,
        scannedByUserId: req.userId,
        success,
        message,
      });
      return res.json({ type: 'reservation', reservation, success, message });
    }
    if (ticket) {
      if (ticket.status === 'valid') {
        success = true;
        message = 'Entrada OK';
        ticket.status = 'used';
        await ticket.save();
      } else {
        message = 'Entrada ya utilizada o cancelada';
      }
      await AccessLog.create({
        eventId: event.id,
        reservationId: null,
        ticketId: ticket.id,
        scannedByUserId: req.userId,
        success,
        message,
      });
      return res.json({ type: 'ticket', ticket, success, message });
    }
    await AccessLog.create({
      eventId: event.id,
      reservationId: null,
      ticketId: null,
      scannedByUserId: req.userId,
      success: false,
      message,
    });
    return res.status(404).json({ success: false, message });
  }
);

router.get(
  '/occupancy/:eventId',
  authenticate,
  requireRole('venue_owner', 'admin', 'staff'),
  async (req, res) => {
    const event = await Event.findByPk(req.params.eventId, { include: [{ model: Venue, as: 'venue' }] });
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' });
    if (req.user.role !== 'admin' && event.venue.ownerId !== req.userId) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    const venueCapacity = event.venue.capacity || 0;
    const reservationsIn = await Reservation.count({
      where: {
        eventId: event.id,
        status: { [Op.in]: ['confirmed', 'completed'] },
      },
    });
    const ticketsValid = await Ticket.count({
      where: { eventId: event.id, status: { [Op.in]: ['valid', 'paid'] } },
    });
    const ticketsUsed = await Ticket.count({
      where: { eventId: event.id, status: 'used' },
    });
    const scanned = await AccessLog.count({
      where: { eventId: event.id, success: true },
    });
    res.json({
      venueCapacity,
      reservationsConfirmed: reservationsIn,
      ticketsValidRemaining: ticketsValid,
      ticketsUsed,
      successfulScans: scanned,
    });
  }
);

module.exports = router;
