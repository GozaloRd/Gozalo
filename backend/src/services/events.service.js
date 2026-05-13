const { Op, fn, col } = require('sequelize');
const {
  sequelize,
  Event,
  Venue,
  VenueTable,
  EventTicketType,
  Reservation,
  Ticket,
  AccessLog,
} = require('../models');

function slugify(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function resolvePublishStatus(body) {
  const isDev = process.env.NODE_ENV === 'development';
  if (body.status === 'draft') return 'draft';
  if (body.status === 'paused') return 'paused';
  if (body.status === 'cancelled') return 'draft';
  if (body.status === 'published') return 'published';
  if (isDev) return 'published';
  return 'draft';
}

function minTicketPrice(ticketTypes, basePrice) {
  const fromTypes = (ticketTypes || [])
    .filter((t) => t.active !== false)
    .map((t) => Number(t.price))
    .filter((n) => !Number.isNaN(n) && n >= 0);
  const minT = fromTypes.length ? Math.min(...fromTypes) : null;
  const base = basePrice != null ? Number(basePrice) : null;
  if (minT != null && base != null) return Math.min(minT, base);
  if (minT != null) return minT;
  if (base != null && !Number.isNaN(base)) return base;
  return null;
}

function normalizeEventImages(j) {
  const raw = j.images;
  let arr = [];
  if (Array.isArray(raw)) {
    arr = raw.filter((u) => typeof u === 'string' && u.trim());
  }
  const cover = j.coverImageUrl || null;
  if (arr.length) return arr;
  return cover ? [cover] : [];
}

function normalizeCollagePhotos(j) {
  const raw = j.collagePhotos;
  if (!Array.isArray(raw)) return [];
  return raw.filter((u) => typeof u === 'string' && u.trim());
}

function mapListEvent(row) {
  const j = typeof row.toJSON === 'function' ? row.toJSON() : { ...row };
  const venueRaw = j.venue;
  const minPrice = minTicketPrice(j.ticketTypes, j.basePrice);
  delete j.ticketTypes;
  const images = normalizeEventImages(j);
  const collagePhotos = normalizeCollagePhotos(j);
  return {
    ...j,
    featured: j.destacado ?? j.featured ?? false,
    publicado: j.publicado ?? j.status === 'published',
    destacado: j.destacado ?? j.featured ?? false,
    images,
    collagePhotos,
    venue: venueRaw
      ? {
          id: venueRaw.id,
          name: venueRaw.name,
          city: venueRaw.city,
          logo: venueRaw.coverImageUrl || null,
          coverImageUrl: venueRaw.coverImageUrl || null,
        }
      : null,
    priceFrom: minPrice,
    minTicketPrice: minPrice,
    requiresCoverForTable: !!j.requiresCoverForTable,
  };
}

async function loadTablesForPublicEvent(event) {
  const tables = await VenueTable.findAll({
    where: {
      venueId: event.venueId,
      active: true,
      [Op.or]: [{ eventId: null }, { eventId: event.id }],
    },
    order: [['zone', 'ASC'], ['label', 'ASC']],
  });

  const reservations = await Reservation.findAll({
    where: {
      eventId: event.id,
      status: { [Op.notIn]: ['cancelled', 'no_show'] },
    },
    attributes: ['tableId', 'status'],
  });

  const taken = new Set(
    reservations
      .filter((r) => ['pending', 'confirmed', 'checked_in', 'completed'].includes(r.status))
      .map((r) => r.tableId)
  );

  return tables.map((t) => {
    const o = t.toJSON();
    const reserved = taken.has(t.id);
    return {
      ...o,
      isAvailable: !reserved,
      estado: reserved ? 'reservada' : 'libre',
    };
  });
}

async function listPublicEvents(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const PUBLIC_MAX_PAGE = 200;
  const pageSize = Math.min(PUBLIC_MAX_PAGE, Math.max(1, parseInt(query.pageSize, 10) || 12));

  const featuredOnly = query.featuredOnly === 'true' || query.featured === 'true';
  const excludeFeatured = query.excludeFeatured === 'true';

  const isDev = process.env.NODE_ENV === 'development';
  const includeDraftsInList = isDev && query.includeDrafts === 'true';
  const where = {};
  if (includeDraftsInList) {
    where[Op.or] = [{ publicado: true }, { status: { [Op.in]: ['published', 'draft'] } }];
  } else {
    where[Op.or] = [{ publicado: true }, { status: 'published' }];
  }

  if (query.city) where.city = query.city;
  if (query.category) where.category = query.category;
  if (query.from || query.to) {
    where.startAt = {};
    if (query.from) where.startAt[Op.gte] = new Date(query.from);
    if (query.to) where.startAt[Op.lte] = new Date(query.to);
  }
  if (featuredOnly) where[Op.and] = [{ [Op.or]: [{ destacado: true }, { featured: true }] }];
  else if (excludeFeatured) {
    where[Op.and] = [{ [Op.and]: [{ destacado: { [Op.not]: true } }, { featured: { [Op.not]: true } }] }];
  }
  // Por defecto lista eventos futuros. Con ?past=true devuelve eventos pasados (para /collage).
  const pastOnly = query.past === 'true';
  if (pastOnly) {
    where.endAt = { [Op.lt]: new Date() };
  } else {
    where.endAt = { [Op.gte]: new Date() };
  }

  const vId = query.venueId && String(query.venueId).trim();
  if (vId) {
    where.venueId = vId;
  }

  if (pastOnly) {
    where.includeInCollage = true;
    where.collageAuthorized = true;
  }

  const rows = await Event.findAll({
    where,
    include: [
      {
        model: Venue,
        as: 'venue',
        where: { status: { [Op.notIn]: ['rejected', 'suspended'] } },
        required: true,
        attributes: ['id', 'name', 'city', 'coverImageUrl'],
      },
    ],
    attributes: [
      'id',
      'slug',
      'title',
      'category',
      'city',
      'startAt',
      'endAt',
      'coverImageUrl',
      'images',
      'collagePhotos',
      'includeInCollage',
      'collageAuthorized',
      'featured',
      'destacado',
      'publicado',
      'status',
      'basePrice',
      'requiresCoverForTable',
    ],
    order: pastOnly
      ? [['startAt', 'DESC']]
      : [['startAt', 'ASC']],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  const eventIds = rows.map((r) => r.id);
  let minPriceByEventId = new Map();
  if (eventIds.length > 0) {
    const mins = await EventTicketType.findAll({
      where: {
        eventId: { [Op.in]: eventIds },
        active: { [Op.not]: false },
      },
      attributes: [
        'eventId',
        [sequelize.fn('MIN', sequelize.col('price')), 'minPrice'],
      ],
      group: ['eventId'],
      raw: true,
    });
    minPriceByEventId = new Map(
      mins.map((row) => [row.eventId, row.minPrice != null ? Number(row.minPrice) : null])
    );
  }

  const total = await Event.count({
    where,
    include: [
      {
        model: Venue,
        as: 'venue',
        where: { status: { [Op.notIn]: ['rejected', 'suspended'] } },
        required: true,
      },
    ],
  });

  const data = rows.map((row) => {
    const j = typeof row.toJSON === 'function' ? row.toJSON() : { ...row };
    const venueRaw = j.venue;
    const minFromTypes = minPriceByEventId.get(j.id) ?? null;
    const base = j.basePrice != null ? Number(j.basePrice) : null;
    const minPrice =
      minFromTypes != null && base != null
        ? Math.min(minFromTypes, base)
        : (minFromTypes ?? base ?? null);
    const images = normalizeEventImages(j);
    const collagePhotos = normalizeCollagePhotos(j);
    return {
      ...j,
      featured: j.destacado ?? j.featured ?? false,
      publicado: j.publicado ?? j.status === 'published',
      destacado: j.destacado ?? j.featured ?? false,
      images,
      collagePhotos,
      venue: venueRaw
        ? {
            id: venueRaw.id,
            name: venueRaw.name,
            city: venueRaw.city,
            logo: venueRaw.coverImageUrl || null,
            coverImageUrl: venueRaw.coverImageUrl || null,
          }
        : null,
      priceFrom: minPrice,
      minTicketPrice: minPrice,
      requiresCoverForTable: !!j.requiresCoverForTable,
    };
  });

  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

async function getPublicEventById(id) {
  const event = await Event.findOne({
    where: { id, [Op.or]: [{ publicado: true }, { status: 'published' }] },
    include: [
      { model: Venue, as: 'venue', attributes: ['id', 'name', 'city', 'coverImageUrl', 'address'] },
      { model: EventTicketType, as: 'ticketTypes', required: false },
    ],
  });
  if (!event) {
    const err = new Error('Evento no encontrado');
    err.status = 404;
    throw err;
  }
  const tables = await loadTablesForPublicEvent(event);
  const j = event.toJSON();
  j.venue = j.venue ? { ...j.venue, logo: j.venue.coverImageUrl } : null;
  j.tables = tables;
  j.ticketTypes = sortTicketTypesJson(j.ticketTypes || []);
  j.priceFrom = minTicketPrice(j.ticketTypes, j.basePrice);
  j.includeInCollage = !!j.includeInCollage;
  j.collageAuthorized = !!j.collageAuthorized;
  j.tableLayoutImageUrl = j.tableLayoutImageUrl || j.table_layout_image_url || null;
  if (!j.includeInCollage || !j.collageAuthorized) {
    j.collagePhotos = [];
  } else {
    j.collagePhotos = normalizeCollagePhotos(j);
  }
  return j;
}

async function getPublicEventBySlug(slug) {
  const event = await Event.findOne({
    where: { slug, [Op.or]: [{ publicado: true }, { status: 'published' }] },
    include: [
      { model: Venue, as: 'venue', attributes: ['id', 'name', 'city', 'coverImageUrl', 'address'] },
      { model: EventTicketType, as: 'ticketTypes', required: false },
    ],
  });
  if (!event) {
    const err = new Error('Evento no encontrado');
    err.status = 404;
    throw err;
  }
  const tables = await loadTablesForPublicEvent(event);
  const j = event.toJSON();
  j.venue = j.venue ? { ...j.venue, logo: j.venue.coverImageUrl } : null;
  j.tables = tables;
  j.ticketTypes = sortTicketTypesJson(j.ticketTypes || []);
  j.priceFrom = minTicketPrice(j.ticketTypes, j.basePrice);
  j.includeInCollage = !!j.includeInCollage;
  j.collageAuthorized = !!j.collageAuthorized;
  j.tableLayoutImageUrl = j.tableLayoutImageUrl || j.table_layout_image_url || null;
  if (!j.includeInCollage || !j.collageAuthorized) {
    j.collagePhotos = [];
  } else {
    j.collagePhotos = normalizeCollagePhotos(j);
  }
  return j;
}

async function getPublicEventTables(eventId) {
  const event = await Event.findByPk(eventId);
  if (!event) {
    const err = new Error('Evento no encontrado');
    err.status = 404;
    throw err;
  }
  const tables = await VenueTable.findAll({
    where: {
      venueId: event.venueId,
      active: true,
      [Op.or]: [{ eventId: null }, { eventId: event.id }],
    },
  });
  const reservations = await Reservation.findAll({
    where: { eventId: event.id, status: { [Op.notIn]: ['cancelled', 'no_show'] } },
    attributes: ['tableId', 'status'],
  });
  const taken = new Set(
    reservations
      .filter((r) => ['pending', 'confirmed', 'checked_in', 'completed'].includes(r.status))
      .map((r) => r.tableId)
  );
  return tables.map((t) => ({
    ...t.toJSON(),
    isAvailable: !taken.has(t.id),
    estado: taken.has(t.id) ? 'reservada' : 'libre',
  }));
}

async function createPublicEvent({ body, userId, userRole }) {
  const venue = await Venue.findByPk(body.venueId);
  if (!venue) {
    const err = new Error('Venue no encontrado');
    err.status = 404;
    throw err;
  }
  if (userRole !== 'admin' && venue.ownerId !== userId) {
    const err = new Error('No autorizado');
    err.status = 403;
    throw err;
  }

  const base = slugify(body.title);
  let slug = base;
  let n = 1;
  while (await Event.findOne({ where: { venueId: venue.id, slug } })) {
    slug = `${base}-${n++}`;
  }

  const status = resolvePublishStatus(body);
  const publicado = status === 'published';
  const destacado = publicado && !!(body.destacado ?? body.featured);

  return Event.create({
    venueId: venue.id,
    title: body.title,
    slug,
    description: body.description,
    category: body.category,
    city: body.city,
    startAt: body.startAt,
    endAt: body.endAt,
    coverImageUrl: body.coverImageUrl,
    images: Array.isArray(body.images) ? body.images.filter(Boolean) : null,
    basePrice: body.basePrice != null ? body.basePrice : null,
    maxCapacity: body.maxCapacity != null ? body.maxCapacity : null,
    requiresCoverForTable: !!body.requiresCoverForTable,
    status,
    featured: destacado,
    publicado,
    destacado,
  });
}

async function updatePublicEvent({ eventId, body, userId, userRole }) {
  const event = await Event.findByPk(eventId, { include: [{ model: Venue, as: 'venue' }] });
  if (!event) {
    const err = new Error('No encontrado');
    err.status = 404;
    throw err;
  }
  const venue = event.venue;
  if (userRole !== 'admin' && venue.ownerId !== userId) {
    const err = new Error('No autorizado');
    err.status = 403;
    throw err;
  }
  const allowed = [
    'title',
    'description',
    'category',
    'city',
    'startAt',
    'endAt',
    'coverImageUrl',
    'images',
    'status',
    'featured',
    'publicado',
    'destacado',
    'basePrice',
    'maxCapacity',
    'requiresCoverForTable',
  ];
  for (const k of allowed) {
    if (body[k] === undefined) continue;
    if (k === 'images') {
      event.images = Array.isArray(body.images)
        ? body.images.filter((u) => typeof u === 'string' && u.trim())
        : null;
      continue;
    }
    event[k] = body[k];
  }
  event.publicado = event.status === 'published';
  if (!event.publicado) {
    event.destacado = false;
    event.featured = false;
  } else {
    if (body.destacado !== undefined) event.destacado = !!body.destacado;
    else if (body.featured !== undefined) event.destacado = !!body.featured;
    else event.destacado = !!event.destacado || !!event.featured;
    event.featured = event.destacado;
  }
  if (body.title && !body.slug) event.slug = slugify(body.title);
  await event.save();
  return event;
}

async function eventAggregates(eventId) {
  const [ticketsSold, reservas, revenueTickets, revenueRes] = await Promise.all([
    Ticket.count({ where: { eventId, status: { [Op.in]: ['paid', 'valid', 'used'] } } }),
    Reservation.count({ where: { eventId, status: { [Op.notIn]: ['cancelled'] } } }),
    Ticket.sum('unitPrice', { where: { eventId, status: { [Op.ne]: 'cancelled' } } }),
    Reservation.sum('totalAmount', {
      where: { eventId, status: { [Op.in]: ['confirmed', 'checked_in', 'completed', 'pending'] } },
    }),
  ]);
  return {
    ticketsVendidos: ticketsSold,
    reservasHechas: reservas,
    ingresosEstimadosRD: Number(revenueTickets || 0) + Number(revenueRes || 0),
  };
}

/**
 * Cuenta tickets vendidos por evento y etiqueta `tickets.ticketType` (en compra suele ir el **nombre**
 * del tipo, no el UUID). `event_ticket_types.soldCount` no se actualiza al vender → el panel mezclaba
 * métricas reales con filas de tipos a 0.
 */
async function ticketSoldCountsGrouped(eventIds) {
  if (!eventIds.length) return new Map();
  const rows = await Ticket.findAll({
    attributes: ['eventId', 'ticketType', [fn('COUNT', col('Ticket.id')), 'soldQty']],
    where: {
      eventId: { [Op.in]: eventIds },
      status: { [Op.in]: ['paid', 'valid', 'used'] },
    },
    group: ['eventId', 'ticketType'],
    raw: true,
  });
  const m = new Map();
  for (const r of rows) {
    m.set(`${r.eventId}::${String(r.ticketType)}`, Number(r.soldQty) || 0);
  }
  return m;
}

function resolveTicketTypeSoldCount(soldMap, eventId, tt) {
  const labels = [tt.id, tt.name, tt.code].filter((x) => x != null && String(x).length > 0).map((x) => String(x));
  for (const label of labels) {
    const v = soldMap.get(`${eventId}::${label}`);
    if (v !== undefined) return v;
  }
  return Number(tt.soldCount) || 0;
}

/** Orden estable para UI y cola secuencial (sort_order, luego nombre). */
function sortTicketTypesJson(types) {
  if (!Array.isArray(types)) return [];
  return [...types].sort((a, b) => {
    const sa = Number(a.sortOrder ?? a.sort_order ?? 0);
    const sb = Number(b.sortOrder ?? b.sort_order ?? 0);
    if (sa !== sb) return sa - sb;
    return String(a.name || '').localeCompare(String(b.name || ''), 'es');
  });
}

async function listDashboardEvents({ venueId, scope = 'all' }) {
  const now = new Date();
  /** Eventos cancelados (= eliminados en panel) no deben aparecer en listas operativas. */
  const where = { venueId, status: { [Op.ne]: 'cancelled' } };
  if (scope === 'upcoming') where.endAt = { [Op.gte]: now };
  if (scope === 'past') where.endAt = { [Op.lt]: now };

  const events = await Event.findAll({
    where,
    include: [{ model: EventTicketType, as: 'ticketTypes', required: false }],
    order: [['startAt', scope === 'past' ? 'DESC' : 'ASC']],
  });

  const eventIds = events.map((e) => e.id);
  const soldMap = await ticketSoldCountsGrouped(eventIds);

  const data = await Promise.all(
    events.map(async (ev) => {
      const json = ev.toJSON();
      const ticketTypes = sortTicketTypesJson(json.ticketTypes || []).map((tt) => ({
        ...tt,
        soldCount: resolveTicketTypeSoldCount(soldMap, ev.id, tt),
      }));
      return {
        ...json,
        ticketTypes,
        metricas: await eventAggregates(ev.id),
      };
    })
  );
  return { data };
}

async function createDashboardEvent({ venueId, body }) {
  const { title, description, category, city, startAt, endAt, coverImageUrl, images, status, featured, ticketTypes } =
    body;
  if (!title || !category || !city || !startAt || !endAt) {
    const err = new Error('Faltan campos obligatorios');
    err.status = 400;
    throw err;
  }

  const base = slugify(title);
  let slug = base;
  let n = 1;
  while (await Event.findOne({ where: { venueId, slug } })) {
    slug = `${base}-${n++}`;
  }

  const isDev = process.env.NODE_ENV === 'development';
  let effectiveStatus = 'draft';
  if (status === 'draft') effectiveStatus = 'draft';
  else if (status === 'published') effectiveStatus = 'published';
  else if (status === 'paused') effectiveStatus = 'paused';
  else if (isDev) effectiveStatus = 'published';

  const publicadoFlag = effectiveStatus === 'published';
  const destacadoFlag = publicadoFlag && !!featured;
  const imagesPayload = images !== undefined ? (Array.isArray(images) ? images : null) : undefined;
  const includeInCollage = body.includeInCollage === false ? false : true;

  const ticketSaleMode =
    String(body.ticketSaleMode || '').toLowerCase() === 'sequential' ? 'sequential' : 'parallel';

  const ev = await Event.create({
    venueId,
    title,
    slug,
    description,
    category,
    city,
    startAt,
    endAt,
    coverImageUrl,
    tableLayoutImageUrl: body.tableLayoutImageUrl?.trim?.() || null,
    images: imagesPayload,
    basePrice: body.basePrice != null ? body.basePrice : null,
    maxCapacity: body.maxCapacity != null ? body.maxCapacity : null,
    requiresCoverForTable: !!body.requiresCoverForTable,
    status: effectiveStatus,
    featured: destacadoFlag,
    publicado: publicadoFlag,
    destacado: destacadoFlag,
    includeInCollage,
    collageAuthorized: false,
    ticketSaleMode,
    wizardMeta: body.wizardMeta != null ? body.wizardMeta : null,
  });

  if (Array.isArray(ticketTypes) && ticketTypes.length) {
    await EventTicketType.bulkCreate(
      ticketTypes.map((tt, idx) => ({
        eventId: ev.id,
        name: tt.name,
        code: tt.code || null,
        description: tt.description || null,
        price: tt.price,
        quantityTotal: tt.quantityTotal ?? null,
        showQuantityPublic: tt.showQuantityPublic !== false,
        active: tt.active !== false,
        sortOrder: tt.sortOrder != null ? Number(tt.sortOrder) : idx,
      }))
    );
  }

  const full = await Event.findByPk(ev.id, { include: [{ model: EventTicketType, as: 'ticketTypes' }] });
  return { evento: { ...full.toJSON(), metricas: await eventAggregates(ev.id) } };
}

async function updateDashboardEvent({ venueId, eventId, body }) {
  const ev = await Event.findOne({ where: { id: eventId, venueId } });
  if (!ev) {
    const err = new Error('Evento no encontrado');
    err.status = 404;
    throw err;
  }

  const allowed = [
    'title',
    'description',
    'category',
    'city',
    'startAt',
    'endAt',
    'coverImageUrl',
    'tableLayoutImageUrl',
    'images',
    'collagePhotos',
    'status',
    'featured',
    'publicado',
    'destacado',
    'basePrice',
    'maxCapacity',
    'requiresCoverForTable',
    'includeInCollage',
    'collageAuthorized',
    'ticketSaleMode',
    'wizardMeta',
  ];
  for (const k of allowed) {
    if (body[k] !== undefined) {
      if (k === 'images') {
        ev.images = Array.isArray(body.images) ? body.images : null;
      } else if (k === 'collagePhotos') {
        ev.collagePhotos = Array.isArray(body.collagePhotos)
          ? body.collagePhotos.filter((u) => typeof u === 'string' && u.trim())
          : [];
      } else if (k === 'ticketSaleMode') {
        ev.ticketSaleMode = String(body.ticketSaleMode).toLowerCase() === 'sequential' ? 'sequential' : 'parallel';
      } else if (k === 'wizardMeta') {
        ev.wizardMeta = body.wizardMeta == null ? null : body.wizardMeta;
      } else {
        ev[k] = body[k];
      }
    }
  }

  ev.publicado = ev.status === 'published';
  if (!ev.publicado) {
    ev.destacado = false;
    ev.featured = false;
  } else {
    if (body.destacado !== undefined) ev.destacado = !!body.destacado;
    else if (body.featured !== undefined) ev.destacado = !!body.featured;
    else ev.destacado = !!ev.destacado || !!ev.featured;
    ev.featured = ev.destacado;
  }
  if (body.title && !body.slug) ev.slug = slugify(body.title);
  await ev.save();

  if (Array.isArray(body.ticketTypes)) {
    await EventTicketType.destroy({ where: { eventId: ev.id } });
    await EventTicketType.bulkCreate(
      body.ticketTypes.map((tt, idx) => ({
        eventId: ev.id,
        name: tt.name,
        code: tt.code || null,
        description: tt.description || null,
        price: tt.price,
        quantityTotal: tt.quantityTotal ?? null,
        showQuantityPublic: tt.showQuantityPublic !== false,
        active: tt.active !== false,
        sortOrder: tt.sortOrder != null ? Number(tt.sortOrder) : idx,
      }))
    );
  }

  const full = await Event.findByPk(ev.id, { include: [{ model: EventTicketType, as: 'ticketTypes' }] });
  return { evento: { ...full.toJSON(), metricas: await eventAggregates(ev.id) } };
}

async function updateEventCollage({ venueId, eventId, photos }) {
  const ev = await Event.findOne({ where: { id: eventId, venueId } });
  if (!ev) {
    const err = new Error('Evento no encontrado');
    err.status = 404;
    throw err;
  }
  if (!Array.isArray(photos)) {
    const err = new Error('photos debe ser un array de URLs');
    err.status = 400;
    throw err;
  }
  const cleaned = photos
    .filter((u) => typeof u === 'string' && u.trim())
    .slice(0, 60);

  // Sólo se permite editar collage de eventos que ya terminaron.
  const endAt = ev.endAt ? new Date(ev.endAt) : null;
  if (!endAt || endAt.getTime() > Date.now()) {
    const err = new Error('Sólo puedes añadir fotos del collage a eventos ya finalizados');
    err.status = 400;
    throw err;
  }
  if (!ev.includeInCollage) {
    const err = new Error(
      'Activa “Añadir al collage público” en la edición del evento para poder subir fotos.',
    );
    err.status = 400;
    throw err;
  }
  if (!ev.collageAuthorized) {
    const err = new Error(
      'Autorizá el collage de este evento en el panel (página Collage) antes de subir fotos.',
    );
    err.status = 400;
    throw err;
  }

  ev.collagePhotos = cleaned;
  await ev.save();
  return { eventId: ev.id, collagePhotos: normalizeCollagePhotos(ev.toJSON()) };
}

async function cancelDashboardEvent({ venueId, eventId }) {
  const ev = await Event.findOne({ where: { id: eventId, venueId } });
  if (!ev) {
    const err = new Error('Evento no encontrado');
    err.status = 404;
    throw err;
  }

  const t = await sequelize.transaction();
  try {
    const ticketRows = await Ticket.findAll({
      where: { eventId: ev.id },
      attributes: ['id'],
      transaction: t,
    });
    const ticketIds = ticketRows.map((r) => r.id);
    if (ticketIds.length) {
      await AccessLog.update(
        { ticketId: null },
        { where: { ticketId: { [Op.in]: ticketIds } }, transaction: t }
      );
      await Ticket.destroy({ where: { id: { [Op.in]: ticketIds } }, transaction: t });
    }

    ev.status = 'cancelled';
    await ev.save({ transaction: t });
    await t.commit();
  } catch (e) {
    await t.rollback();
    throw e;
  }
  return { ok: true, id: ev.id, status: ev.status };
}

module.exports = {
  listPublicEvents,
  getPublicEventById,
  getPublicEventBySlug,
  getPublicEventTables,
  createPublicEvent,
  updatePublicEvent,
  listDashboardEvents,
  createDashboardEvent,
  updateDashboardEvent,
  updateEventCollage,
  cancelDashboardEvent,
};
