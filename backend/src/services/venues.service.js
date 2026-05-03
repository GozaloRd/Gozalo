const { Venue, User, Event, VenueTable } = require('../models');

function slugify(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function listMineVenues({ userRole, userId }) {
  return Venue.findAll({
    where: userRole === 'admin' ? {} : { ownerId: userId },
    include: [{ model: Event, as: 'events', required: false }],
  });
}

async function listVenues({ city, status }) {
  const where = {};
  if (city) where.city = city;
  if (status) where.status = status;
  else where.status = 'approved';

  return Venue.findAll({
    where,
    include: [{ model: User, as: 'owner', attributes: ['id', 'fullName'] }],
    order: [['name', 'ASC']],
  });
}

async function getVenueTables(venueId) {
  const venue = await Venue.findByPk(venueId);
  if (!venue) {
    const err = new Error('Local no encontrado');
    err.status = 404;
    throw err;
  }

  return VenueTable.findAll({
    where: { venueId: venue.id, eventId: null },
    order: [['zone', 'ASC'], ['label', 'ASC']],
  });
}

async function createVenueTable({ venueId, userRole, userId, body }) {
  const venue = await Venue.findByPk(venueId);
  if (!venue) {
    const err = new Error('No encontrado');
    err.status = 404;
    throw err;
  }
  if (userRole !== 'admin' && venue.ownerId !== userId) {
    const err = new Error('No autorizado');
    err.status = 403;
    throw err;
  }
  if (userRole !== 'admin' && venue.status !== 'approved') {
    const err = new Error(
      'Tu local aún no está aprobado. Debes esperar aprobación del admin para operar mesas y eventos.'
    );
    err.status = 403;
    throw err;
  }

  return VenueTable.create({
    venueId: venue.id,
    eventId: body.eventId || null,
    zone: body.zone || 'General',
    label: body.label,
    capacity: body.capacity || 4,
    minPrice: body.minPrice ?? null,
    posX: body.posX ?? 0,
    posY: body.posY ?? 0,
    active: body.active !== false,
  });
}

async function updateVenueTable({ venueId, tableId, userRole, userId, body }) {
  const venue = await Venue.findByPk(venueId);
  if (!venue) {
    const err = new Error('No encontrado');
    err.status = 404;
    throw err;
  }
  if (userRole !== 'admin' && venue.ownerId !== userId) {
    const err = new Error('No autorizado');
    err.status = 403;
    throw err;
  }
  if (userRole !== 'admin' && venue.status !== 'approved') {
    const err = new Error(
      'Tu local aún no está aprobado. Debes esperar aprobación del admin para operar mesas y eventos.'
    );
    err.status = 403;
    throw err;
  }

  const table = await VenueTable.findOne({
    where: { id: tableId, venueId: venue.id },
  });
  if (!table) {
    const err = new Error('Mesa no encontrada');
    err.status = 404;
    throw err;
  }

  const keys = ['zone', 'label', 'capacity', 'minPrice', 'posX', 'posY', 'active', 'eventId'];
  for (const k of keys) {
    if (body[k] !== undefined) table[k] = body[k];
  }
  await table.save();
  return table;
}

async function getVenueById(venueId) {
  const venue = await Venue.findByPk(venueId, {
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
  if (!venue) {
    const err = new Error('Local no encontrado');
    err.status = 404;
    throw err;
  }
  return venue;
}

async function createVenue({ userRole, userId, body }) {
  const base = slugify(body.name);
  let slug = base;
  let n = 1;
  while (await Venue.findOne({ where: { slug } })) {
    slug = `${base}-${n++}`;
  }

  return Venue.create({
    ownerId: userRole === 'admin' ? body.ownerId || userId : userId,
    name: body.name,
    slug,
    description: body.description,
    city: body.city,
    address: body.address,
    capacity: body.capacity || 0,
    status: userRole === 'admin' ? 'approved' : 'pending',
  });
}

function trimStr(v, max) {
  if (v === undefined || v === null) return '';
  const s = String(v).trim();
  if (!s) return '';
  return max ? s.slice(0, max) : s;
}

/**
 * Estructura guardada en venues.payout_profile
 */
function sanitizePayoutProfile(raw) {
  if (raw === null) return null;
  if (typeof raw !== 'object' || Array.isArray(raw)) return null;
  const at = trimStr(raw.accountType, 20);
  const accountType = ['ahorros', 'corriente', 'otro', ''].includes(at) ? at : '';
  const o = {
    bankName: trimStr(raw.bankName, 120),
    accountHolder: trimStr(raw.accountHolder, 200),
    idTax: trimStr(raw.idTax, 40),
    accountType,
    accountNumber: trimStr(raw.accountNumber, 50),
    bankSwiftOrRouting: trimStr(raw.bankSwiftOrRouting, 80),
    transferInstructions: trimStr(raw.transferInstructions, 2000),
  };
  const has = Object.values(o).some((x) => x && String(x).length > 0);
  return has ? o : null;
}

async function updateVenue({ venueId, userRole, userId, body }) {
  const venue = await Venue.findByPk(venueId);
  if (!venue) {
    const err = new Error('No encontrado');
    err.status = 404;
    throw err;
  }
  if (userRole !== 'admin' && venue.ownerId !== userId) {
    const err = new Error('No autorizado');
    err.status = 403;
    throw err;
  }
  const allowed = ['name', 'description', 'city', 'address', 'capacity', 'coverImageUrl'];
  for (const k of allowed) {
    if (body[k] !== undefined) venue[k] = body[k];
  }
  if (body.payoutProfile !== undefined) {
    if (body.payoutProfile === null) {
      venue.payoutProfile = null;
    } else {
      const sanitized = sanitizePayoutProfile(body.payoutProfile);
      venue.payoutProfile = sanitized;
    }
  }
  await venue.save();
  return venue;
}

async function updateVenueStatus({ venueId, status }) {
  const venue = await Venue.findByPk(venueId);
  if (!venue) {
    const err = new Error('No encontrado');
    err.status = 404;
    throw err;
  }
  venue.status = status;
  await venue.save();
  return venue;
}

module.exports = {
  listMineVenues,
  listVenues,
  getVenueTables,
  createVenueTable,
  updateVenueTable,
  getVenueById,
  createVenue,
  updateVenue,
  updateVenueStatus,
};
