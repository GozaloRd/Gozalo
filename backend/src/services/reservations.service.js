const { Op } = require('sequelize');
const { Reservation, Event, VenueTable, Venue, User } = require('../models');
const { createPayload, generateQrPng } = require('./qrService');
const { sendReservationConfirmation } = require('./emailService');
const { normalizeReservationStatus } = require('../controllers/dashboardHelpers');

function toPage({ page, pageSize }) {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const size = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
  return { page: p, pageSize: size, offset: (p - 1) * size };
}

async function createReservation({ user, userId, body }) {
  const event = await Event.findByPk(body.eventId, { include: [{ model: Venue, as: 'venue' }] });
  if (!event || event.status !== 'published') {
    const err = new Error('Evento no disponible');
    err.status = 400;
    throw err;
  }

  const table = await VenueTable.findByPk(body.tableId);
  if (!table || table.venueId !== event.venueId) {
    const err = new Error('Mesa inválida');
    err.status = 400;
    throw err;
  }
  if (table.eventId && table.eventId !== event.id) {
    const err = new Error('Mesa no asignada a este evento');
    err.status = 400;
    throw err;
  }

  const alreadyTaken = await Reservation.findOne({
    where: {
      eventId: event.id,
      tableId: table.id,
      status: { [Op.in]: ['pending', 'confirmed', 'checked_in', 'completed'] },
    },
  });
  if (alreadyTaken) {
    const err = new Error('La mesa seleccionada ya no está disponible');
    err.status = 409;
    throw err;
  }

  const tableAmount = Number(table.minPrice || body.minDeposit || 500);
  const cover = body.cover || {};
  const coverQuantity = Number(cover.quantity || 0);
  const coverUnitPrice = Number(cover.unitPrice || 0);
  const coverAmount = coverQuantity > 0 ? coverQuantity * coverUnitPrice : 0;

  const subtotal = Number((tableAmount + coverAmount).toFixed(2));
  const fee = Number((subtotal * 0.008).toFixed(2));
  const total = Number((subtotal + fee).toFixed(2));

  const configured = Number(table.initialPaymentPercent);
  const tablePct =
    Number.isFinite(configured) && configured >= 1 && configured <= 100 ? configured : 50;

  let paymentOption = body.paymentOption === 'partial' ? 'partial' : 'total';
  // Si el local exige pago completo al reservar, no se admite parcial.
  if (tablePct >= 100) {
    paymentOption = 'total';
  }
  const upfrontPercent = paymentOption === 'partial' ? tablePct : 100;
  const payNow = Number(((total * upfrontPercent) / 100).toFixed(2));
  const pendingAtVenue = Number((total - payNow).toFixed(2));

  const details = {
    table: { id: table.id, zone: table.zone, label: table.label, capacity: table.capacity, amount: tableAmount },
    cover:
      coverQuantity > 0
        ? {
            ticketType: cover.ticketType || 'Cover',
            quantity: coverQuantity,
            unitPrice: coverUnitPrice,
            amount: coverAmount,
          }
        : null,
    fee,
    total,
    paymentOption,
    upfrontPercent,
    payNow,
    pendingAtVenue,
  };

  const qrPayload = createPayload('res');
  const reservation = await Reservation.create({
    userId,
    eventId: event.id,
    tableId: table.id,
    partySize: body.partySize,
    totalAmount: payNow,
    status: 'pending',
    qrPayload,
    notes: JSON.stringify({
      customerNotes: body.notes || null,
      payment: details,
    }),
  });
  const qrImage = await generateQrPng(qrPayload);
  await sendReservationConfirmation(user.email, {
    name: user.fullName,
    eventTitle: event.title,
    venueName: event.venue.name,
    status: reservation.status,
    tableLabel: `${table.zone} ${table.label}`,
    partySize: reservation.partySize,
    total,
  }).catch(() => {});
  return { reservation, qrImage, breakdown: details };
}

async function listMyReservations(userId) {
  return Reservation.findAll({
    where: { userId },
    include: [
      { model: Event, as: 'event', include: [{ model: Venue, as: 'venue' }] },
      { model: VenueTable, as: 'table' },
    ],
    order: [['createdAt', 'DESC']],
  });
}

async function listReservationsByVenue({ venueId, userId, userRole }) {
  const venue = await Venue.findByPk(venueId);
  if (!venue) {
    const err = new Error('Local no encontrado');
    err.status = 404;
    throw err;
  }
  if (userRole !== 'admin' && venue.ownerId !== userId) {
    const err = new Error('No autorizado');
    err.status = 403;
    throw err;
  }

  return Reservation.findAll({
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
}

async function updateReservationStatus({ reservationId, status, userId, userRole }) {
  const reservation = await Reservation.findByPk(reservationId, {
    include: [{ model: Event, as: 'event', include: [{ model: Venue, as: 'venue' }] }],
  });
  if (!reservation) {
    const err = new Error('No encontrado');
    err.status = 404;
    throw err;
  }
  const venue = reservation.event.venue;
  if (userRole !== 'admin' && venue.ownerId !== userId) {
    const err = new Error('No autorizado');
    err.status = 403;
    throw err;
  }
  reservation.status = status;
  if (status === 'checked_in' && !reservation.checkedInAt) {
    reservation.checkedInAt = new Date();
  }
  await reservation.save();
  return reservation;
}

async function confirmReservationPayment({ reservationId, userId }) {
  const reservation = await Reservation.findByPk(reservationId);
  if (!reservation || reservation.userId !== userId) {
    const err = new Error('No encontrado');
    err.status = 404;
    throw err;
  }
  reservation.status = 'confirmed';
  await reservation.save();
  return reservation;
}

async function cancelMyReservation({ reservationId, userId }) {
  const reservation = await Reservation.findByPk(reservationId);
  if (!reservation || reservation.userId !== userId) {
    const err = new Error('No encontrado');
    err.status = 404;
    throw err;
  }
  if (reservation.status !== 'pending') {
    const err = new Error('Solo se pueden cancelar reservas pendientes');
    err.status = 400;
    throw err;
  }
  reservation.status = 'cancelled';
  await reservation.save();
  return { ok: true, reservation };
}

async function listDashboardReservations({ venueId, query }) {
  const { page, pageSize, offset } = toPage(query);
  const eventId = query.eventId || null;
  const statusRaw = normalizeReservationStatus(query.status);
  const from = query.from ? new Date(query.from) : null;
  const to = query.to ? new Date(query.to) : null;
  const sort = query.sort === 'asc' ? 'ASC' : 'DESC';

  const where = {};
  if (statusRaw) where.status = statusRaw;
  if (from && to) where.createdAt = { [Op.between]: [from, to] };
  else if (from) where.createdAt = { [Op.gte]: from };
  else if (to) where.createdAt = { [Op.lte]: to };

  const eventWhere = { venueId };
  if (eventId) eventWhere.id = eventId;

  const { rows, count } = await Reservation.findAndCountAll({
    where,
    include: [
      { model: User, as: 'user', attributes: ['id', 'fullName', 'email', 'phone'] },
      {
        model: Event,
        as: 'event',
        where: eventWhere,
        required: true,
        attributes: ['id', 'title', 'startAt', 'venueId'],
      },
      { model: VenueTable, as: 'table', attributes: ['id', 'zone', 'label'] },
    ],
    order: [['createdAt', sort]],
    limit: pageSize,
    offset,
  });

  const data = rows.map((row) => ({
    id: row.id,
    cliente: {
      nombre: row.user?.fullName,
      email: row.user?.email,
      telefono: row.user?.phone,
    },
    evento: row.event ? { id: row.event.id, titulo: row.event.title, fecha: row.event.startAt } : null,
    mesa: row.table ? `${row.table.zone} ${row.table.label}` : null,
    tableId: row.table ? row.table.id : null,
    partySize: row.partySize,
    montoRD: Number(row.totalAmount),
    estado: row.status,
    horaCheckIn: row.checkedInAt,
    creadoEn: row.createdAt,
    notes: row.notes || null,
  }));

  return {
    data,
    pagination: { page, pageSize, total: count, totalPages: Math.ceil(count / pageSize) },
  };
}

module.exports = {
  createReservation,
  listMyReservations,
  listReservationsByVenue,
  updateReservationStatus,
  confirmReservationPayment,
  cancelMyReservation,
  listDashboardReservations,
};
