/**
 * ⚠️ ARCHIVO LEGACY - NO USAR
 *
 * Este archivo fue reemplazado por:
 * - routes/tickets.routes.js
 */
const express = require('express');
const { body, validationResult } = require('express-validator');
const { Ticket, Event, Order, Venue, User } = require('../models');
const { authenticate } = require('../middleware/auth');
const { createPayload, generateQrPng } = require('../services/qrService');

const router = express.Router();

router.post(
  '/purchase',
  authenticate,
  [
    body('eventId').isUUID(),
    body('items').isArray({ min: 1 }),
    body('items.*.ticketType').trim().notEmpty(),
    body('items.*.quantity').isInt({ min: 1 }),
    body('items.*.unitPrice').isFloat({ min: 0 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const event = await Event.findByPk(req.body.eventId, { include: [{ model: Venue, as: 'venue' }] });
    if (!event || event.status !== 'published') {
      return res.status(400).json({ error: 'Evento no disponible' });
    }
    let subtotal = 0;
    for (const line of req.body.items) {
      subtotal += line.quantity * line.unitPrice;
    }
    const order = await Order.create({
      userId: req.userId,
      venueId: event.venueId,
      eventId: event.id,
      type: 'tickets',
      status: 'open',
      subtotal,
      tax: 0,
      total: subtotal,
    });
    const tickets = [];
    for (const line of req.body.items) {
      for (let i = 0; i < line.quantity; i++) {
        const qrPayload = createPayload('tix');
        const t = await Ticket.create({
          eventId: event.id,
          userId: req.userId,
          orderId: order.id,
          ticketType: line.ticketType,
          unitPrice: line.unitPrice,
          qrPayload,
          status: 'paid',
        });
        tickets.push(t);
      }
    }
    order.status = 'paid';
    await order.save();
    const withQr = await Promise.all(
      tickets.map(async (t) => ({
        ...t.toJSON(),
        qrImage: await generateQrPng(t.qrPayload),
      }))
    );
    res.status(201).json({ order, tickets: withQr });
  }
);

router.get('/my', authenticate, async (req, res) => {
  const tickets = await Ticket.findAll({
    where: { userId: req.userId },
    include: [{ model: Event, as: 'event', include: [{ model: Venue, as: 'venue' }] }],
    order: [['createdAt', 'DESC']],
  });
  res.json(tickets);
});

module.exports = router;
