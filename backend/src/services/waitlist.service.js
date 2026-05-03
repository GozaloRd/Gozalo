const { Op } = require('sequelize');
const { EventWaitlist, Event, Ticket, User, Reservation } = require('../models');

/**
 * Devuelve cuántas plazas pagables "quedan" en un evento: `maxCapacity - (tickets pagados + partySize de reservas activas)`.
 * Si `maxCapacity` es nulo o cero, devuelve `Infinity` (no se considera limitado).
 */
async function remainingCapacity(event) {
  const maxCap = Number(event.maxCapacity || 0);
  if (!maxCap) return Infinity;
  const [paidTickets, partySum] = await Promise.all([
    Ticket.count({
      where: { eventId: event.id, status: { [Op.in]: ['paid', 'valid', 'used'] } },
    }),
    Reservation.sum('partySize', {
      where: {
        eventId: event.id,
        status: { [Op.in]: ['pending', 'confirmed', 'checked_in', 'completed'] },
      },
    }),
  ]);
  const used = Number(paidTickets || 0) + Number(partySum || 0);
  return Math.max(0, maxCap - used);
}

async function isSoldOut(event) {
  return (await remainingCapacity(event)) <= 0;
}

async function joinWaitlist({ userId, eventId, body = {} }) {
  const event = await Event.findByPk(eventId);
  if (!event) {
    const err = new Error('Evento no encontrado');
    err.status = 404;
    throw err;
  }
  if (new Date(event.endAt).getTime() < Date.now()) {
    const err = new Error('El evento ya ha terminado');
    err.status = 400;
    throw err;
  }

  const partySize = Math.max(1, parseInt(body.partySize, 10) || 1);

  const existing = await EventWaitlist.findOne({ where: { userId, eventId } });
  if (existing && existing.status !== 'cancelled' && existing.status !== 'expired') {
    existing.partySize = partySize;
    existing.ticketTypeId = body.ticketTypeId || null;
    existing.note = body.note || null;
    if (existing.status === 'claimed') {
      const err = new Error('Ya compraste desde la lista');
      err.status = 400;
      throw err;
    }
    await existing.save();
    return { entry: existing, position: await positionOf(existing) };
  }
  if (existing) {
    existing.status = 'waiting';
    existing.partySize = partySize;
    existing.ticketTypeId = body.ticketTypeId || null;
    existing.note = body.note || null;
    existing.notifiedAt = null;
    existing.claimedAt = null;
    await existing.save();
    return { entry: existing, position: await positionOf(existing) };
  }

  const created = await EventWaitlist.create({
    userId,
    eventId,
    partySize,
    ticketTypeId: body.ticketTypeId || null,
    note: body.note || null,
  });
  return { entry: created, position: await positionOf(created) };
}

async function leaveWaitlist({ userId, eventId }) {
  const entry = await EventWaitlist.findOne({ where: { userId, eventId } });
  if (!entry) return { ok: true };
  entry.status = 'cancelled';
  await entry.save();
  return { ok: true };
}

async function getMyEntry({ userId, eventId }) {
  const entry = await EventWaitlist.findOne({ where: { userId, eventId } });
  if (!entry) return null;
  return { entry, position: await positionOf(entry) };
}

async function positionOf(entry) {
  if (entry.status !== 'waiting' && entry.status !== 'offered') return null;
  const ahead = await EventWaitlist.count({
    where: {
      eventId: entry.eventId,
      status: 'waiting',
      createdAt: { [Op.lt]: entry.createdAt },
    },
  });
  return ahead + 1;
}

async function listEventWaitlist({ eventId, status }) {
  const where = { eventId };
  if (status) where.status = status;
  const rows = await EventWaitlist.findAll({
    where,
    include: [{ model: User, as: 'user', attributes: ['id', 'fullName', 'email', 'phone'] }],
    order: [['createdAt', 'ASC']],
  });
  return rows;
}

/**
 * Marca al siguiente N en la cola como "offered" (notificado) — pensado para
 * ejecutarse cuando se libera cupo tras un reembolso/cancelación.
 */
async function notifyNext({ eventId, count = 1 }) {
  const next = await EventWaitlist.findAll({
    where: { eventId, status: 'waiting' },
    order: [['createdAt', 'ASC']],
    limit: count,
  });
  for (const entry of next) {
    entry.status = 'offered';
    entry.notifiedAt = new Date();
    await entry.save();
  }
  return next;
}

module.exports = {
  joinWaitlist,
  leaveWaitlist,
  getMyEntry,
  listEventWaitlist,
  notifyNext,
  isSoldOut,
  remainingCapacity,
};
