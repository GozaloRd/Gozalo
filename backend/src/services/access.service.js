const { Op } = require('sequelize');
const { Reservation, Ticket, Event, AccessLog, Venue } = require('../models');
const guestlistService = require('./guestlist.service');

async function assertEventAccess({ eventId, userId, userRole }) {
  const event = await Event.findByPk(eventId, { include: [{ model: Venue, as: 'venue' }] });
  if (!event) {
    const err = new Error('Evento no encontrado');
    err.status = 404;
    throw err;
  }
  if (userRole !== 'admin' && event.venue.ownerId !== userId) {
    const err = new Error('No autorizado');
    err.status = 403;
    throw err;
  }
  return event;
}

async function scanAccess({ payload, eventId, userId, userRole }) {
  const event = await assertEventAccess({ eventId, userId, userRole });

  // Guestlist VIP / cortesías (payload "GL:xxx") — no se cuenta como reserva pagada.
  if (typeof payload === 'string' && payload.startsWith(guestlistService.QR_PREFIX)) {
    const guest = await guestlistService.scanGuestQr({ payload, eventId: event.id, checkedInBy: userId });
    const ok = !!guest && guest.ok;
    await AccessLog.create({
      eventId: event.id,
      reservationId: null,
      ticketId: null,
      scannedByUserId: userId,
      success: ok,
      message: guest?.message || (ok ? 'Invitado VIP OK' : 'QR de invitado inválido'),
    });
    if (ok) {
      return { type: 'guestlist', entry: guest.entry, success: true, message: 'Invitado VIP OK' };
    }
    const err = new Error(guest?.message || 'QR de invitado inválido');
    err.status = 400;
    err.payload = { success: false, message: guest?.message || 'QR de invitado inválido', entry: guest?.entry || null };
    throw err;
  }

  let reservation = await Reservation.findOne({ where: { qrPayload: payload, eventId: event.id } });
  let ticket = await Ticket.findOne({ where: { qrPayload: payload, eventId: event.id } });
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
      scannedByUserId: userId,
      success,
      message,
    });
    return { type: 'reservation', reservation, success, message };
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
      scannedByUserId: userId,
      success,
      message,
    });
    return { type: 'ticket', ticket, success, message };
  }

  await AccessLog.create({
    eventId: event.id,
    reservationId: null,
    ticketId: null,
    scannedByUserId: userId,
    success: false,
    message,
  });
  const err = new Error(message);
  err.status = 404;
  err.payload = { success: false, message };
  throw err;
}

async function getOccupancy({ eventId, userId, userRole }) {
  const event = await assertEventAccess({ eventId, userId, userRole });
  const venueCapacity = event.venue.capacity || 0;
  const reservationsIn = await Reservation.count({
    where: { eventId: event.id, status: { [Op.in]: ['confirmed', 'completed'] } },
  });
  const ticketsValid = await Ticket.count({
    where: { eventId: event.id, status: { [Op.in]: ['valid', 'paid'] } },
  });
  const ticketsUsed = await Ticket.count({ where: { eventId: event.id, status: 'used' } });
  const scanned = await AccessLog.count({ where: { eventId: event.id, success: true } });

  return {
    venueCapacity,
    reservationsConfirmed: reservationsIn,
    ticketsValidRemaining: ticketsValid,
    ticketsUsed,
    successfulScans: scanned,
  };
}

module.exports = {
  scanAccess,
  getOccupancy,
};
