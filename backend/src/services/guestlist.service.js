const crypto = require('crypto');
const { Op } = require('sequelize');
const { GuestListEntry, Event, User } = require('../models');

const QR_PREFIX = 'GL:';

function generateGuestQr() {
  return QR_PREFIX + crypto.randomUUID();
}

async function assertEventOwned({ eventId, venueId }) {
  const ev = await Event.findOne({ where: { id: eventId, venueId } });
  if (!ev) {
    const err = new Error('Evento no encontrado');
    err.status = 404;
    throw err;
  }
  return ev;
}

async function listGuestList({ venueId, eventId, status }) {
  await assertEventOwned({ eventId, venueId });
  const where = { eventId, venueId };
  if (status) where.status = status;
  const rows = await GuestListEntry.findAll({
    where,
    order: [['createdAt', 'DESC']],
  });
  const totalGuests = rows
    .filter((r) => r.status !== 'cancelled')
    .reduce((acc, r) => acc + Number(r.partySize || 1), 0);
  const checkedIn = rows
    .filter((r) => r.status === 'checked_in')
    .reduce((acc, r) => acc + Number(r.partySize || 1), 0);
  return {
    data: rows,
    summary: {
      totalEntries: rows.filter((r) => r.status !== 'cancelled').length,
      totalGuests,
      checkedIn,
    },
  };
}

async function createGuestEntry({ venueId, eventId, userId, body }) {
  await assertEventOwned({ eventId, venueId });
  if (!body?.fullName || !String(body.fullName).trim()) {
    const err = new Error('El nombre es obligatorio');
    err.status = 400;
    throw err;
  }
  const entry = await GuestListEntry.create({
    eventId,
    venueId,
    createdByUserId: userId || null,
    fullName: String(body.fullName).trim(),
    phone: body.phone || null,
    email: body.email || null,
    partySize: Math.max(1, parseInt(body.partySize, 10) || 1),
    category: body.category || 'VIP',
    notes: body.notes || null,
    qrPayload: generateGuestQr(),
  });
  return entry;
}

async function updateGuestEntry({ venueId, eventId, entryId, body }) {
  await assertEventOwned({ eventId, venueId });
  const entry = await GuestListEntry.findOne({ where: { id: entryId, eventId, venueId } });
  if (!entry) {
    const err = new Error('Invitado no encontrado');
    err.status = 404;
    throw err;
  }
  const editable = ['fullName', 'phone', 'email', 'partySize', 'category', 'notes', 'status'];
  for (const k of editable) {
    if (body[k] !== undefined) entry[k] = body[k];
  }
  if (body.status === 'checked_in' && !entry.checkedInAt) {
    entry.checkedInAt = new Date();
  }
  await entry.save();
  return entry;
}

async function deleteGuestEntry({ venueId, eventId, entryId }) {
  await assertEventOwned({ eventId, venueId });
  const entry = await GuestListEntry.findOne({ where: { id: entryId, eventId, venueId } });
  if (!entry) return { ok: true };
  entry.status = 'cancelled';
  await entry.save();
  return { ok: true };
}

/**
 * Check-in por escaneo del QR de guestlist. Devuelve un resultado similar
 * al de access-scan normal para integrarse con la UI existente.
 */
async function scanGuestQr({ payload, eventId, checkedInBy }) {
  if (!payload || !payload.startsWith(QR_PREFIX)) return null;
  const entry = await GuestListEntry.findOne({ where: { qrPayload: payload } });
  if (!entry) {
    return { ok: false, reason: 'not_found', message: 'Invitado no encontrado' };
  }
  if (eventId && entry.eventId !== eventId) {
    return { ok: false, reason: 'wrong_event', message: 'QR de otro evento' };
  }
  if (entry.status === 'cancelled') {
    return { ok: false, reason: 'cancelled', message: 'Invitación cancelada', entry };
  }
  if (entry.status === 'checked_in') {
    return { ok: false, reason: 'already_in', message: 'Ya entró', entry };
  }
  entry.status = 'checked_in';
  entry.checkedInAt = new Date();
  entry.checkedInBy = checkedInBy || null;
  await entry.save();
  return { ok: true, entry };
}

module.exports = {
  listGuestList,
  createGuestEntry,
  updateGuestEntry,
  deleteGuestEntry,
  scanGuestQr,
  QR_PREFIX,
};
