/**
 * ⚠️ ARCHIVO LEGACY - NO USAR
 *
 * Este archivo fue reemplazado por:
 * - routes/events.routes.js
 */
const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const {
  Event,
  Venue,
  VenueTable,
  EventTicketType,
  Reservation,
} = require('../models');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

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

function mapListEvent(row) {
  const j = typeof row.toJSON === 'function' ? row.toJSON() : { ...row };
  const venueRaw = j.venue;
  const minPrice = minTicketPrice(j.ticketTypes, j.basePrice);
  delete j.ticketTypes;
  const images = normalizeEventImages(j);
  return {
    ...j,
    featured: j.destacado ?? j.featured ?? false,
    publicado: j.publicado ?? j.status === 'published',
    destacado: j.destacado ?? j.featured ?? false,
    images,
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
      .filter((r) =>
        ['pending', 'confirmed', 'checked_in', 'completed'].includes(r.status)
      )
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

router.get(
  '/',
  [
    query('city').optional().trim(),
    query('category').optional().trim(),
    query('from').optional().isISO8601(),
    query('to').optional().isISO8601(),
    query('featured').optional(),
    query('featuredOnly').optional(),
    query('excludeFeatured').optional(),
    query('status').optional().trim(),
    query('page').optional().isInt({ min: 1 }),
    query('pageSize').optional().isInt({ min: 1, max: 100 }),
  ],
  async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const PUBLIC_MAX_PAGE = 100;
      const pageSize = Math.min(
        PUBLIC_MAX_PAGE,
        Math.max(1, parseInt(req.query.pageSize, 10) || 12)
      );

      const featuredOnly =
        req.query.featuredOnly === 'true' ||
        req.query.featured === 'true';
      const excludeFeatured = req.query.excludeFeatured === 'true';

      const isDev = process.env.NODE_ENV === 'development';
      const includeDraftsInList = isDev && req.query.includeDrafts === 'true';
      const where = {};
      if (includeDraftsInList) {
        where[Op.or] = [{ publicado: true }, { status: { [Op.in]: ['published', 'draft'] } }];
      } else {
        where[Op.or] = [{ publicado: true }, { status: 'published' }];
      }
      if (req.query.city) where.city = req.query.city;
      if (req.query.category) where.category = req.query.category;
      if (req.query.from || req.query.to) {
        where.startAt = {};
        if (req.query.from) where.startAt[Op.gte] = new Date(req.query.from);
        if (req.query.to) where.startAt[Op.lte] = new Date(req.query.to);
      }
      if (featuredOnly) where[Op.and] = [{ [Op.or]: [{ destacado: true }, { featured: true }] }];
      else if (excludeFeatured)
        where[Op.and] = [{ [Op.and]: [{ destacado: { [Op.not]: true } }, { featured: { [Op.not]: true } }] }];

      where.endAt = { [Op.gte]: new Date() };

      const { count, rows } = await Event.findAndCountAll({
        where,
        distinct: true,
        col: 'id',
        subQuery: false,
        include: [
          {
            model: Venue,
            as: 'venue',
            // Incluye locales aún en revisión para que los eventos publicados sean visibles
            // (reservas/entradas). Excluye rechazados o suspendidos.
            where: { status: { [Op.notIn]: ['rejected', 'suspended'] } },
            required: true,
            attributes: ['id', 'name', 'city', 'coverImageUrl'],
          },
          {
            model: EventTicketType,
            as: 'ticketTypes',
            required: false,
            separate: true,
            attributes: ['id', 'price', 'active'],
          },
        ],
        order: [
          ['featured', 'DESC'],
          ['startAt', 'ASC'],
        ],
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });

      const data = rows.map(mapListEvent);
      return res.json({
        data,
        pagination: {
          page,
          pageSize,
          total: count,
          totalPages: Math.max(1, Math.ceil(count / pageSize)),
        },
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Error al listar eventos' });
    }
  }
);

router.get('/by-id/:id', async (req, res) => {
  try {
    const event = await Event.findOne({
      where: {
        id: req.params.id,
        [Op.or]: [{ publicado: true }, { status: 'published' }],
      },
      include: [
        {
          model: Venue,
          as: 'venue',
          attributes: ['id', 'name', 'city', 'coverImageUrl', 'address'],
        },
        { model: EventTicketType, as: 'ticketTypes', required: false },
      ],
    });
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

    const tables = await loadTablesForPublicEvent(event);
    const j = event.toJSON();
    j.venue = j.venue
      ? {
          ...j.venue,
          logo: j.venue.coverImageUrl,
        }
      : null;
    j.tables = tables;
    j.priceFrom = minTicketPrice(j.ticketTypes, j.basePrice);
    return res.json(j);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error al cargar evento' });
  }
});

router.get('/slug/:slug', async (req, res) => {
  try {
    const event = await Event.findOne({
      where: {
        slug: req.params.slug,
        [Op.or]: [{ publicado: true }, { status: 'published' }],
      },
      include: [
        {
          model: Venue,
          as: 'venue',
          attributes: ['id', 'name', 'city', 'coverImageUrl', 'address'],
        },
        { model: EventTicketType, as: 'ticketTypes', required: false },
      ],
    });
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

    const tables = await loadTablesForPublicEvent(event);
    const j = event.toJSON();
    j.venue = j.venue
      ? {
          ...j.venue,
          logo: j.venue.coverImageUrl,
        }
      : null;
    j.tables = tables;
    j.priceFrom = minTicketPrice(j.ticketTypes, j.basePrice);
    return res.json(j);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error al cargar evento' });
  }
});

router.get('/:id/tables', async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

    const tables = await VenueTable.findAll({
      where: {
        venueId: event.venueId,
        active: true,
        [Op.or]: [{ eventId: null }, { eventId: event.id }],
      },
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
        .filter((r) =>
          ['pending', 'confirmed', 'checked_in', 'completed'].includes(r.status)
        )
        .map((r) => r.tableId)
    );

    const out = tables.map((t) => ({
      ...t.toJSON(),
      isAvailable: !taken.has(t.id),
      estado: taken.has(t.id) ? 'reservada' : 'libre',
    }));
    return res.json(out);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error al listar mesas' });
  }
});

router.post(
  '/',
  authenticate,
  requireRole('venue_owner', 'admin', 'staff'),
  [
    body('venueId').isUUID(),
    body('title').trim().notEmpty(),
    body('category').trim().notEmpty(),
    body('city').trim().notEmpty(),
    body('startAt').isISO8601(),
    body('endAt').isISO8601(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const venue = await Venue.findByPk(req.body.venueId);
    if (!venue) return res.status(404).json({ error: 'Venue no encontrado' });
    if (req.user.role !== 'admin' && venue.ownerId !== req.userId) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    const base = slugify(req.body.title);
    let slug = base;
    let n = 1;
    while (await Event.findOne({ where: { venueId: venue.id, slug } })) {
      slug = `${base}-${n++}`;
    }
    const status = resolvePublishStatus(req.body);
    const publicado = status === 'published';
    const destacado = publicado && !!(req.body.destacado ?? req.body.featured);
    const event = await Event.create({
      venueId: venue.id,
      title: req.body.title,
      slug,
      description: req.body.description,
      category: req.body.category,
      city: req.body.city,
      startAt: req.body.startAt,
      endAt: req.body.endAt,
      coverImageUrl: req.body.coverImageUrl,
      images: Array.isArray(req.body.images) ? req.body.images.filter(Boolean) : null,
      basePrice: req.body.basePrice != null ? req.body.basePrice : null,
      maxCapacity: req.body.maxCapacity != null ? req.body.maxCapacity : null,
      status,
      featured: destacado,
      publicado,
      destacado,
    });
    res.status(201).json(event);
  }
);

router.patch('/:id', authenticate, requireRole('venue_owner', 'admin'), async (req, res) => {
  const event = await Event.findByPk(req.params.id, { include: [{ model: Venue, as: 'venue' }] });
  if (!event) return res.status(404).json({ error: 'No encontrado' });
  const venue = event.venue;
  if (req.user.role !== 'admin' && venue.ownerId !== req.userId) {
    return res.status(403).json({ error: 'No autorizado' });
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
  ];
  for (const k of allowed) {
    if (req.body[k] === undefined) continue;
    if (k === 'images') {
      event.images = Array.isArray(req.body.images)
        ? req.body.images.filter((u) => typeof u === 'string' && u.trim())
        : null;
      continue;
    }
    event[k] = req.body[k];
  }
  event.publicado = event.status === 'published';
  if (!event.publicado) {
    event.destacado = false;
    event.featured = false;
  } else {
    if (req.body.destacado !== undefined) {
      event.destacado = !!req.body.destacado;
    } else if (req.body.featured !== undefined) {
      event.destacado = !!req.body.featured;
    } else {
      event.destacado = !!event.destacado || !!event.featured;
    }
    event.featured = event.destacado;
  }
  if (req.body.title && !req.body.slug) {
    event.slug = slugify(req.body.title);
  }
  await event.save();
  res.json(event);
});

module.exports = router;
