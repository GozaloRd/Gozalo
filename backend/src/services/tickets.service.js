const { Op } = require('sequelize');
const { Ticket, Event, Order, Venue, User } = require('../models');
const { createPayload, generateQrPng } = require('./qrService');
const { sendTicketEmail } = require('./ticketEmail.service');
const { normalizeTicketStatus, ticketStatusWhere, parsePage } = require('../controllers/dashboardHelpers');

function mapTicketStatusOut(s) {
  if (s === 'valid') return 'paid';
  return s;
}

async function purchaseTickets({ userId, body }) {
  const event = await Event.findByPk(body.eventId, { include: [{ model: Venue, as: 'venue' }] });
  if (!event || event.status !== 'published') {
    const err = new Error('Evento no disponible');
    err.status = 400;
    throw err;
  }

  let subtotal = 0;
  for (const line of body.items) subtotal += line.quantity * line.unitPrice;

  const order = await Order.create({
    userId,
    venueId: event.venueId,
    eventId: event.id,
    type: 'tickets',
    status: 'open',
    subtotal,
    tax: 0,
    total: subtotal,
  });

  const tickets = [];
  for (const line of body.items) {
    for (let i = 0; i < line.quantity; i += 1) {
      const qrPayload = createPayload('tix');
      const t = await Ticket.create({
        eventId: event.id,
        userId,
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

  try {
    await sendTicketEmail(order);
  } catch (e) {
    console.warn('[tickets] sendTicketEmail inesperado:', e.message);
  }

  return { order, tickets: withQr };
}

async function listMyTickets(userId) {
  return Ticket.findAll({
    where: { userId },
    include: [
      {
        model: Event,
        as: 'event',
        required: true,
        where: { status: { [Op.ne]: 'cancelled' } },
        include: [{ model: Venue, as: 'venue' }],
      },
    ],
    order: [['createdAt', 'DESC']],
  });
}

async function listDashboardTickets({ venueId, query }) {
  const { page, pageSize, offset } = parsePage({ query });
  const eventId = query.eventId || null;
  const st = normalizeTicketStatus(query.status);
  const whereTicket = {};
  const ts = ticketStatusWhere(st);
  if (ts) Object.assign(whereTicket, { status: ts });
  else if (st) whereTicket.status = st;

  const eventWhere = { venueId, status: { [Op.ne]: 'cancelled' } };
  if (eventId) eventWhere.id = eventId;

  const { rows, count } = await Ticket.findAndCountAll({
    where: whereTicket,
    include: [
      { model: User, as: 'user', attributes: ['id', 'fullName', 'email'] },
      {
        model: Event,
        as: 'event',
        where: eventWhere,
        required: true,
        attributes: ['id', 'title', 'startAt'],
      },
    ],
    order: [['createdAt', 'DESC']],
    limit: pageSize,
    offset,
  });

  const data = rows.map((t) => ({
    id: t.id,
    comprador: { nombre: t.user?.fullName, email: t.user?.email },
    evento: t.event ? { id: t.event.id, titulo: t.event.title } : null,
    tipoEntrada: t.ticketType,
    cantidad: 1,
    montoRD: Number(t.unitPrice),
    estado: mapTicketStatusOut(t.status),
    creadoEn: t.createdAt,
  }));

  return {
    data,
    pagination: { page, pageSize, total: count, totalPages: Math.ceil(count / pageSize) },
  };
}

module.exports = {
  purchaseTickets,
  listMyTickets,
  listDashboardTickets,
};
