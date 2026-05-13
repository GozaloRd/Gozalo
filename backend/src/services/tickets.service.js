const { Op } = require('sequelize');
const { Ticket, Event, Order, Venue, User, EventTicketType } = require('../models');
const { findOrCreateCustomerByEmail } = require('./guestUser.service');
const { assertPurchaseTicketLinesAllowed } = require('../utils/ticketQueue');
const { createPayload, generateQrPng } = require('./qrService');
const { sendTicketEmail } = require('./ticketEmail.service');
const {
  normalizeTicketStatus,
  ticketStatusWhere,
  parsePage,
} = require('../controllers/dashboardHelpers');

/** Recargo consumidor web sobre subtotal de entradas (alineado con comisión ~10 % tickets en admin). */
const TICKET_CONSUMER_SURCHARGE_RATE = 0.1;

function ticketConsumerFeeFromSubtotal(subtotalRd) {
  return Number((Number(subtotalRd) * TICKET_CONSUMER_SURCHARGE_RATE).toFixed(2));
}

function ticketOrderConsumerTotalFromSubtotal(subtotalRd) {
  const sub = Number(subtotalRd);
  return Number((sub + ticketConsumerFeeFromSubtotal(sub)).toFixed(2));
}

function mapTicketStatusOut(s) {
  if (s === 'valid') return 'paid';
  return s;
}

async function resolvePurchaseUserId(userId, body) {
  if (userId) return userId;
  return findOrCreateCustomerByEmail(body.buyerEmail, body.buyerFullName, 'tickets');
}

async function purchaseTickets({ userId, body }) {
  const event = await Event.findByPk(body.eventId, { include: [{ model: Venue, as: 'venue' }] });
  if (!event || event.status !== 'published') {
    const err = new Error('Evento no disponible');
    err.status = 400;
    throw err;
  }

  await assertPurchaseTicketLinesAllowed({
    Ticket,
    EventTicketType,
    event,
    items: body.items,
  });

  const resolvedUserId = await resolvePurchaseUserId(userId, body);

  let subtotal = 0;
  for (const line of body.items) subtotal += line.quantity * line.unitPrice;
  const subtotalRd = Number(Number(subtotal).toFixed(2));
  const consumerFee = ticketConsumerFeeFromSubtotal(subtotalRd);
  const totalCliente = ticketOrderConsumerTotalFromSubtotal(subtotalRd);

  const order = await Order.create({
    userId: resolvedUserId,
    venueId: event.venueId,
    eventId: event.id,
    type: 'tickets',
    status: 'open',
    subtotal: subtotalRd,
    tax: consumerFee,
    total: totalCliente,
  });

  const tickets = [];
  for (const line of body.items) {
    for (let i = 0; i < line.quantity; i += 1) {
      const t = await Ticket.create({
        eventId: event.id,
        userId: resolvedUserId,
        orderId: order.id,
        ticketType: line.ticketType,
        unitPrice: line.unitPrice,
        qrPayload: createPayload('tix'),
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

  const from = query.from ? new Date(query.from) : null;
  const to = query.to ? new Date(query.to) : null;
  if (from && to) {
    whereTicket.createdAt = { [Op.between]: [from, to] };
  } else if (from) {
    whereTicket.createdAt = { [Op.gte]: from };
  } else if (to) {
    whereTicket.createdAt = { [Op.lte]: to };
  }

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
    orderId: t.orderId || null,
    comprador: { nombre: t.user?.fullName, email: t.user?.email },
    evento: t.event ? { id: t.event.id, titulo: t.event.title } : null,
    tipoEntrada: t.ticketType,
    cantidad: 1,
    montoRD: Number(Number(t.unitPrice || 0).toFixed(2)),
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
