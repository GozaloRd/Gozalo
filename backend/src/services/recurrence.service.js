const { Op } = require('sequelize');
const { Event, EventTicketType, VenueTable } = require('../models');

function slugify(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function ensureUniqueSlug(venueId, base, extra = 0) {
  let slug = extra === 0 ? base : `${base}-${extra}`;
  let n = extra || 1;
  while (await Event.findOne({ where: { venueId, slug } })) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

/**
 * Genera copias semanales de un evento existente.
 *
 * @param {Object} opts
 * @param {string} opts.sourceEventId - Evento base (plantilla).
 * @param {number} opts.weeks         - Cuántas semanas replicar (1..26).
 * @param {boolean} opts.copyTickets  - Copiar tipos de entrada.
 * @param {boolean} opts.copyTables   - Copiar mesas (VenueTable no es por evento, se ignora).
 * @param {boolean} opts.publish      - Si true, las copias se crean publicadas; si no, quedan en draft.
 * @returns {Promise<{ parentId, created: Array<{ id, title, startAt, endAt, slug }> }>}
 */
async function createWeeklyRecurrence({ sourceEventId, weeks, copyTickets = true, publish = false, venueId }) {
  if (!sourceEventId) {
    const err = new Error('sourceEventId requerido');
    err.status = 400;
    throw err;
  }
  const w = Math.max(1, Math.min(26, Number(weeks) || 4));

  const source = await Event.findOne({
    where: { id: sourceEventId, venueId },
    include: [{ model: EventTicketType, as: 'ticketTypes', required: false }],
  });
  if (!source) {
    const err = new Error('Evento base no encontrado para este local');
    err.status = 404;
    throw err;
  }

  const baseStart = new Date(source.startAt).getTime();
  const baseEnd = new Date(source.endAt).getTime();
  const baseSlug = source.slug.replace(/-semana-\d+$/i, '');

  const created = [];
  for (let i = 1; i <= w; i++) {
    const offset = i * 7 * 24 * 60 * 60 * 1000;
    const newStart = new Date(baseStart + offset);
    const newEnd = new Date(baseEnd + offset);
    const slug = await ensureUniqueSlug(venueId, `${baseSlug}-semana-${i}`);

    const child = await Event.create({
      venueId,
      title: source.title,
      slug,
      description: source.description,
      category: source.category,
      city: source.city,
      startAt: newStart,
      endAt: newEnd,
      coverImageUrl: source.coverImageUrl,
      images: source.images,
      basePrice: source.basePrice,
      maxCapacity: source.maxCapacity,
      status: publish ? 'published' : 'draft',
      featured: false,
      requiresCoverForTable: source.requiresCoverForTable,
      recurrenceParentId: source.id,
    });

    if (copyTickets && source.ticketTypes?.length) {
      const rows = source.ticketTypes.map((t) => ({
        eventId: child.id,
        name: t.name,
        description: t.description,
        price: t.price,
        quantityAvailable: t.quantityAvailable,
        isActive: t.isActive,
      }));
      await EventTicketType.bulkCreate(rows);
    }

    created.push({
      id: child.id,
      title: child.title,
      startAt: child.startAt,
      endAt: child.endAt,
      slug: child.slug,
      status: child.status,
    });
  }

  // Marca el evento base con la regla (para que el dashboard sepa que es una plantilla)
  const currentRule = source.recurrenceRule || {};
  await source.update({
    recurrenceRule: {
      ...currentRule,
      type: 'weekly',
      weeksGenerated: (Number(currentRule.weeksGenerated) || 0) + w,
      lastGeneratedAt: new Date().toISOString(),
    },
  });

  return {
    parentId: source.id,
    parentTitle: source.title,
    created,
  };
}

/**
 * Lista series recurrentes del local (eventos padre + cantidad de hijos).
 */
async function listVenueRecurrences(venueId) {
  const parents = await Event.findAll({
    where: {
      venueId,
      recurrenceRule: { [Op.ne]: null },
    },
    order: [['startAt', 'DESC']],
  });

  const result = await Promise.all(
    parents.map(async (p) => {
      const children = await Event.count({
        where: { venueId, recurrenceParentId: p.id },
      });
      const upcoming = await Event.count({
        where: {
          venueId,
          recurrenceParentId: p.id,
          startAt: { [Op.gte]: new Date() },
        },
      });
      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        startAt: p.startAt,
        rule: p.recurrenceRule,
        totalChildren: children,
        upcomingChildren: upcoming,
      };
    })
  );

  return result;
}

module.exports = { createWeeklyRecurrence, listVenueRecurrences };
