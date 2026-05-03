/**
 * ⚠️ ARCHIVO LEGACY - NO USAR
 * 
 * Toda la lógica de este archivo ya fue migrada a:
 * - services/events.service.js
 * - services/reservations.service.js
 * - services/tickets.service.js
 * - services/pos.service.js
 * - services/dashboard.service.js
 * - services/access.service.js
 * - services/admin.service.js
 * 
 * Se conserva solo como referencia.
 * Se puede eliminar cuando se confirme que todo funciona.
 */
const { Op, QueryTypes } = require('sequelize');
const {
  sequelize,
  Venue,
  Event,
  VenueTable,
  Reservation,
  Ticket,
  Order,
  OrderItem,
  Product,
  Payment,
  User,
  EventTicketType,
  VenueStaff,
  CashClosing,
} = require('../models');
const {
  rangesNow,
  pctChange,
  parsePage,
  normalizeReservationStatus,
  normalizeTicketStatus,
  ticketStatusWhere,
  startOfDay,
  endOfDay,
  addDays,
} = require('./dashboardHelpers');

function slugify(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function sumPaymentRevenue(venueId, start, end) {
  const rows = await sequelize.query(
    `
    SELECT COALESCE(SUM(p.amount), 0)::decimal AS total
    FROM payments p
    LEFT JOIN orders o ON p.order_id = o.id
    LEFT JOIN reservations r ON p.reservation_id = r.id
    LEFT JOIN events e ON r.event_id = e.id
    WHERE p.status = 'completed'
    AND p.created_at BETWEEN :start AND :end
    AND (o.venue_id = :venueId OR e.venue_id = :venueId)
  `,
    { replacements: { venueId, start, end }, type: QueryTypes.SELECT }
  );
  return Number(rows[0]?.total || 0);
}

async function countReservationsInRange(venueId, start, end) {
  return Reservation.count({
    where: { createdAt: { [Op.between]: [start, end] } },
    include: [{ model: Event, as: 'event', where: { venueId }, attributes: [], required: true }],
  });
}

async function countTicketsInRange(venueId, start, end) {
  return Ticket.count({
    where: { createdAt: { [Op.between]: [start, end] } },
    include: [{ model: Event, as: 'event', where: { venueId }, attributes: [], required: true }],
  });
}

async function occupancySnapshot(venue) {
  const now = new Date();
  const activeEvent = await Event.findOne({
    where: {
      venueId: venue.id,
      status: 'published',
      startAt: { [Op.lte]: now },
      endAt: { [Op.gte]: now },
    },
    order: [['startAt', 'DESC']],
  });
  if (!activeEvent) {
    return {
      activeEvent: null,
      currentAttendees: 0,
      maxCapacity: venue.capacity || 0,
      ratio: 0,
    };
  }
  const partySum = await Reservation.sum('partySize', {
    where: {
      eventId: activeEvent.id,
      status: { [Op.in]: ['confirmed', 'checked_in', 'completed'] },
    },
  });
  const paidTickets = await Ticket.count({
    where: {
      eventId: activeEvent.id,
      status: { [Op.in]: ['paid', 'valid'] },
    },
  });
  const current = Number(partySum || 0) + Number(paidTickets || 0);
  const max = venue.capacity || 0;
  return {
    activeEvent: { id: activeEvent.id, title: activeEvent.title },
    currentAttendees: current,
    maxCapacity: max,
    ratio: max > 0 ? Number((current / max).toFixed(4)) : 0,
  };
}

async function buildPeriodStats(venueId, r) {
  const [rt0, rt1, rw0, rw1, rm0, rm1] = await Promise.all([
    countReservationsInRange(venueId, r.today.start, r.today.end),
    countReservationsInRange(venueId, r.prevToday.start, r.prevToday.end),
    countReservationsInRange(venueId, r.week.start, r.week.end),
    countReservationsInRange(venueId, r.prevWeek.start, r.prevWeek.end),
    countReservationsInRange(venueId, r.month.start, r.month.end),
    countReservationsInRange(venueId, r.prevMonth.start, r.prevMonth.end),
  ]);
  const [tt0, tt1, tw0, tw1, tm0, tm1] = await Promise.all([
    countTicketsInRange(venueId, r.today.start, r.today.end),
    countTicketsInRange(venueId, r.prevToday.start, r.prevToday.end),
    countTicketsInRange(venueId, r.week.start, r.week.end),
    countTicketsInRange(venueId, r.prevWeek.start, r.prevWeek.end),
    countTicketsInRange(venueId, r.month.start, r.month.end),
    countTicketsInRange(venueId, r.prevMonth.start, r.prevMonth.end),
  ]);
  const [revT0, revT1, revW0, revW1, revM0, revM1] = await Promise.all([
    sumPaymentRevenue(venueId, r.today.start, r.today.end),
    sumPaymentRevenue(venueId, r.prevToday.start, r.prevToday.end),
    sumPaymentRevenue(venueId, r.week.start, r.week.end),
    sumPaymentRevenue(venueId, r.prevWeek.start, r.prevWeek.end),
    sumPaymentRevenue(venueId, r.month.start, r.month.end),
    sumPaymentRevenue(venueId, r.prevMonth.start, r.prevMonth.end),
  ]);

  return {
    reservations: {
      today: rt0,
      week: rw0,
      month: rm0,
      changeVsPrevious: {
        todayPct: pctChange(rt0, rt1),
        weekPct: pctChange(rw0, rw1),
        monthPct: pctChange(rm0, rm1),
      },
    },
    ticketsSold: {
      today: tt0,
      week: tw0,
      month: tm0,
      changeVsPrevious: {
        todayPct: pctChange(tt0, tt1),
        weekPct: pctChange(tw0, tw1),
        monthPct: pctChange(tm0, tm1),
      },
    },
    revenue: {
      totalRD: {
        today: revT0,
        week: revW0,
        month: revM0,
      },
      changeVsPrevious: {
        todayPct: pctChange(revT0, revT1),
        weekPct: pctChange(revW0, revW1),
        monthPct: pctChange(revM0, revM1),
      },
    },
  };
}

/** GET /api/venues/mine */
async function getMineVenue(req, res) {
  try {
    if (!['venue_owner', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Solo dueños de local o administradores' });
    }
    let venue;
    if (req.user.role === 'admin') {
      if (!req.query.venueId) {
        const venues = await Venue.findAll({
          attributes: ['id', 'name', 'city', 'status', 'slug'],
          order: [['name', 'ASC']],
          include: [{ model: User, as: 'owner', attributes: ['id', 'fullName', 'email'] }],
          limit: 500,
        });
        return res.json({
          venue: null,
          stats: null,
          needsVenuePick: true,
          venues,
          viewerRole: 'admin',
        });
      }
      venue = await Venue.findByPk(req.query.venueId, {
        include: [{ model: User, as: 'owner', attributes: ['id', 'fullName', 'email'] }],
      });
    } else {
      venue = await Venue.findOne({
        where: { ownerId: req.userId },
        order: [['createdAt', 'ASC']],
        include: [{ model: User, as: 'owner', attributes: ['id', 'fullName', 'email'] }],
      });
    }
    if (!venue && req.user.role === 'venue_owner') {
      return res.json({
        venue: null,
        stats: null,
        needsVenue: true,
        viewerRole: 'venue_owner',
      });
    }
    if (!venue) return res.status(404).json({ error: 'Local no encontrado' });

    const r = rangesNow();
    const stats = await buildPeriodStats(venue.id, r);
    const activeEvents = await Event.count({
      where: {
        venueId: venue.id,
        status: 'published',
        endAt: { [Op.gte]: new Date() },
      },
    });
    const occ = await occupancySnapshot(venue);

    return res.json({
      venue,
      stats: {
        ...stats,
        activeEvents,
        occupancy: occ,
      },
      viewerRole: req.user.role,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error al obtener el local' });
  }
}

/** GET /api/dashboard/stats */
async function getStats(req, res) {
  try {
    const venueId = req.venueId;
    const r = rangesNow();
    const base = await buildPeriodStats(venueId, r);
    const activeEvents = await Event.count({
      where: {
        venueId,
        status: 'published',
        endAt: { [Op.gte]: new Date() },
      },
    });
    const venue = req.venue;
    const occ = await occupancySnapshot(venue);

    return res.json({
      venueId,
      period: {
        today: { from: r.today.start, to: r.today.end },
        week: { from: r.week.start, to: r.week.end },
        month: { from: r.month.start, to: r.month.end },
      },
      ...base,
      activeEvents,
      occupancy: occ,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error al calcular estadísticas' });
  }
}

/** GET /api/dashboard/reservations */
async function listReservations(req, res) {
  try {
    const venueId = req.venueId;
    const { page, pageSize, offset } = parsePage(req);
    const eventId = req.query.eventId || null;
    const statusRaw = normalizeReservationStatus(req.query.status);
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;
    const sort = req.query.sort === 'asc' ? 'ASC' : 'DESC';

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
        {
          model: User,
          as: 'user',
          attributes: ['id', 'fullName', 'email', 'phone'],
        },
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
      partySize: row.partySize,
      montoRD: Number(row.totalAmount),
      estado: row.status,
      horaCheckIn: row.checkedInAt,
      creadoEn: row.createdAt,
    }));

    return res.json({
      data,
      pagination: { page, pageSize, total: count, totalPages: Math.ceil(count / pageSize) },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error al listar reservas' });
  }
}

function mapTicketStatusOut(s) {
  if (s === 'valid') return 'paid';
  return s;
}

/** GET /api/dashboard/tickets */
async function listTickets(req, res) {
  try {
    const venueId = req.venueId;
    const { page, pageSize, offset } = parsePage(req);
    const eventId = req.query.eventId || null;
    const st = normalizeTicketStatus(req.query.status);
    const whereTicket = {};
    const ts = ticketStatusWhere(st);
    if (ts) Object.assign(whereTicket, { status: ts });
    else if (st) whereTicket.status = st;

    const eventWhere = { venueId };
    if (eventId) eventWhere.id = eventId;

    const { rows, count } = await Ticket.findAndCountAll({
      where: whereTicket,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'fullName', 'email'],
        },
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

    return res.json({
      data,
      pagination: { page, pageSize, total: count, totalPages: Math.ceil(count / pageSize) },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error al listar tickets' });
  }
}

async function eventAggregates(eventId) {
  const [ticketsSold, reservas, revenueTickets, revenueRes] = await Promise.all([
    Ticket.count({ where: { eventId, status: { [Op.in]: ['paid', 'valid', 'used'] } } }),
    Reservation.count({
      where: { eventId, status: { [Op.notIn]: ['cancelled'] } },
    }),
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

/** GET /api/dashboard/events */
async function listDashboardEvents(req, res) {
  try {
    const venueId = req.venueId;
    const scope = req.query.scope || 'all';
    const now = new Date();
    const where = { venueId };
    if (scope === 'upcoming') where.endAt = { [Op.gte]: now };
    if (scope === 'past') where.endAt = { [Op.lt]: now };

    const events = await Event.findAll({
      where,
      include: [{ model: EventTicketType, as: 'ticketTypes', required: false }],
      order: [['startAt', scope === 'past' ? 'DESC' : 'ASC']],
    });

    const out = await Promise.all(
      events.map(async (ev) => {
        const agg = await eventAggregates(ev.id);
        return {
          ...ev.toJSON(),
          metricas: agg,
        };
      })
    );

    return res.json({ data: out });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error al listar eventos' });
  }
}

/** POST /api/dashboard/events */
async function createDashboardEvent(req, res) {
  try {
    const venueId = req.venueId;
    const {
      title,
      description,
      category,
      city,
      startAt,
      endAt,
      coverImageUrl,
      images,
      status,
      featured,
      ticketTypes,
    } = req.body;

    if (!title || !category || !city || !startAt || !endAt) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
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
    else effectiveStatus = 'draft';

    const publicadoFlag = effectiveStatus === 'published';
    const destacadoFlag = publicadoFlag && !!featured;

    let imagesPayload = undefined;
    if (images !== undefined) {
      imagesPayload = Array.isArray(images) ? images : null;
    }

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
      images: imagesPayload,
      basePrice: req.body.basePrice != null ? req.body.basePrice : null,
      maxCapacity: req.body.maxCapacity != null ? req.body.maxCapacity : null,
      status: effectiveStatus,
      featured: destacadoFlag,
      publicado: publicadoFlag,
      destacado: destacadoFlag,
    });

    if (Array.isArray(ticketTypes) && ticketTypes.length) {
      await EventTicketType.bulkCreate(
        ticketTypes.map((tt) => ({
          eventId: ev.id,
          name: tt.name,
          code: tt.code || null,
          description: tt.description || null,
          price: tt.price,
          quantityTotal: tt.quantityTotal ?? null,
          showQuantityPublic: tt.showQuantityPublic !== false,
          active: tt.active !== false,
        }))
      );
    }

    const full = await Event.findByPk(ev.id, {
      include: [{ model: EventTicketType, as: 'ticketTypes' }],
    });
    const agg = await eventAggregates(ev.id);
    return res.status(201).json({ evento: { ...full.toJSON(), metricas: agg } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error al crear evento' });
  }
}

/** PUT /api/dashboard/events/:id */
async function updateDashboardEvent(req, res) {
  try {
    const venueId = req.venueId;
    const ev = await Event.findOne({ where: { id: req.params.id, venueId } });
    if (!ev) return res.status(404).json({ error: 'Evento no encontrado' });

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
      if (req.body[k] !== undefined) {
        if (k === 'images') {
          ev[k] = Array.isArray(req.body.images) ? req.body.images : null;
        } else {
          ev[k] = req.body[k];
        }
      }
    }
    ev.publicado = ev.status === 'published';
    if (!ev.publicado) {
      ev.destacado = false;
      ev.featured = false;
    } else {
      if (req.body.destacado !== undefined) {
        ev.destacado = !!req.body.destacado;
      } else if (req.body.featured !== undefined) {
        ev.destacado = !!req.body.featured;
      } else {
        ev.destacado = !!ev.destacado || !!ev.featured;
      }
      ev.featured = ev.destacado;
    }
    if (req.body.title && !req.body.slug) {
      ev.slug = slugify(req.body.title);
    }
    await ev.save();

    if (Array.isArray(req.body.ticketTypes)) {
      await EventTicketType.destroy({ where: { eventId: ev.id } });
      await EventTicketType.bulkCreate(
        req.body.ticketTypes.map((tt) => ({
          eventId: ev.id,
          name: tt.name,
          code: tt.code || null,
          description: tt.description || null,
          price: tt.price,
          quantityTotal: tt.quantityTotal ?? null,
          showQuantityPublic: tt.showQuantityPublic !== false,
          active: tt.active !== false,
        }))
      );
    }

    const full = await Event.findByPk(ev.id, {
      include: [{ model: EventTicketType, as: 'ticketTypes' }],
    });
    const agg = await eventAggregates(ev.id);
    return res.json({ evento: { ...full.toJSON(), metricas: agg } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error al actualizar evento' });
  }
}

/** DELETE /api/dashboard/events/:id */
async function cancelDashboardEvent(req, res) {
  try {
    const venueId = req.venueId;
    const ev = await Event.findOne({ where: { id: req.params.id, venueId } });
    if (!ev) return res.status(404).json({ error: 'Evento no encontrado' });
    ev.status = 'cancelled';
    await ev.save();
    return res.json({ ok: true, id: ev.id, status: ev.status });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error al cancelar evento' });
  }
}

async function computeTableStatus(tableId, eventId) {
  if (!eventId) return 'libre';
  const openOrder = await Order.findOne({
    where: { tableId, eventId, status: 'open' },
  });
  if (openOrder) return 'ocupada';

  const resv = await Reservation.findOne({
    where: {
      tableId,
      eventId,
      status: { [Op.notIn]: ['cancelled'] },
    },
    order: [['createdAt', 'DESC']],
  });
  if (!resv) return 'libre';
  if (['pending', 'confirmed'].includes(resv.status)) return 'reservada';
  if (['checked_in', 'completed'].includes(resv.status)) return 'ocupada';
  return 'libre';
}

/** GET /api/dashboard/tables */
async function listDashboardTables(req, res) {
  try {
    const venueId = req.venueId;
    const eventId = req.query.eventId || null;
    const zone = req.query.zone || null;
    const where = { venueId };
    if (zone) where.zone = zone;
    if (eventId && req.query.tableScope === 'event') {
      where.eventId = eventId;
    }

    const tables = await VenueTable.findAll({
      where,
      order: [['zone', 'ASC'], ['label', 'ASC']],
    });

    const withStatus = await Promise.all(
      tables.map(async (t) => {
        let estado = 'libre';
        if (eventId) estado = await computeTableStatus(t.id, eventId);
        return {
          ...t.toJSON(),
          estadoEnEvento: eventId ? estado : null,
        };
      })
    );

    const byZone = {};
    for (const row of withStatus) {
      if (!byZone[row.zone]) byZone[row.zone] = [];
      byZone[row.zone].push(row);
    }

    return res.json({ zonas: byZone, mesas: withStatus });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error al listar mesas' });
  }
}

/** POST /api/dashboard/tables */
async function createDashboardTable(req, res) {
  try {
    const venueId = req.venueId;
    const t = await VenueTable.create({
      venueId,
      eventId: req.body.eventId || null,
      zone: req.body.zone || 'General',
      label: req.body.label,
      capacity: req.body.capacity ?? 4,
      minPrice: req.body.minPrice ?? null,
      posX: req.body.posX ?? 0,
      posY: req.body.posY ?? 0,
      active: req.body.active !== false,
    });
    return res.status(201).json(t);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error al crear mesa' });
  }
}

/** PUT /api/dashboard/tables/:id */
async function updateDashboardTable(req, res) {
  try {
    const venueId = req.venueId;
    const t = await VenueTable.findOne({ where: { id: req.params.id, venueId } });
    if (!t) return res.status(404).json({ error: 'Mesa no encontrada' });
    const keys = ['zone', 'label', 'capacity', 'minPrice', 'posX', 'posY', 'active', 'eventId'];
    for (const k of keys) {
      if (req.body[k] !== undefined) t[k] = req.body[k];
    }
    await t.save();
    return res.json(t);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error al actualizar mesa' });
  }
}

/** DELETE /api/dashboard/tables/:id — desactivar */
async function deactivateDashboardTable(req, res) {
  try {
    const venueId = req.venueId;
    const t = await VenueTable.findOne({ where: { id: req.params.id, venueId } });
    if (!t) return res.status(404).json({ error: 'Mesa no encontrada' });
    t.active = false;
    await t.save();
    return res.json({ ok: true, id: t.id, active: t.active });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error al desactivar mesa' });
  }
}

/** GET /api/dashboard/orders */
async function listDashboardOrders(req, res) {
  try {
    const venueId = req.venueId;
    const eventId = req.query.eventId || null;
    const where = { venueId, status: { [Op.in]: ['open', 'paid'] } };
    if (eventId) where.eventId = eventId;

    const orders = await Order.findAll({
      where,
      include: [
        { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] },
        { model: VenueTable, as: 'table' },
        { model: Event, as: 'event' },
        { model: User, as: 'waiter', attributes: ['id', 'fullName'], required: false },
      ],
      order: [['createdAt', 'DESC']],
    });
    return res.json({ data: orders });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error al listar órdenes' });
  }
}

/** POST /api/dashboard/orders */
async function createDashboardOrder(req, res) {
  try {
    const venueId = req.venueId;
    const order = await Order.create({
      venueId,
      tableId: req.body.tableId || null,
      eventId: req.body.eventId || null,
      userId: req.body.customerUserId || null,
      waiterId: req.userId,
      type: 'pos',
      status: 'open',
      subtotal: 0,
      tax: 0,
      total: 0,
    });
    return res.status(201).json(order);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error al crear orden' });
  }
}

/** POST /api/dashboard/orders/:orderId/items */
async function addDashboardOrderItems(req, res) {
  try {
    const venueId = req.venueId;
    const order = await Order.findByPk(req.params.orderId);
    if (!order || order.venueId !== venueId) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }
    const product = await Product.findByPk(req.body.productId);
    if (!product || product.venueId !== venueId) {
      return res.status(400).json({ error: 'Producto inválido' });
    }
    const qty = req.body.quantity || 1;
    const lineTotal = Number(product.price) * qty;
    await OrderItem.create({
      orderId: order.id,
      productId: product.id,
      quantity: qty,
      unitPrice: product.price,
      lineTotal,
    });
    const items = await OrderItem.findAll({
      where: { orderId: order.id },
      include: [{ model: Product, as: 'product' }],
    });
    const subtotal = items.reduce((s, i) => s + Number(i.lineTotal), 0);
    order.subtotal = subtotal;
    order.total = subtotal;
    await order.save();
    return res.json({ order, items });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error al agregar ítems' });
  }
}

/** POST /api/dashboard/orders/:orderId/close */
async function closeDashboardOrder(req, res) {
  try {
    const venueId = req.venueId;
    const order = await Order.findByPk(req.params.orderId);
    if (!order || order.venueId !== venueId) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }
    const method = req.body.method || 'cash';
    const commissionRate = 0.05;
    const commissionAmount = Number(order.total) * commissionRate;
    const payment = await Payment.create({
      orderId: order.id,
      amount: order.total,
      method,
      status: 'completed',
      commissionAmount,
    });
    order.status = 'paid';
    await order.save();
    return res.json({ order, payment });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error al cerrar orden' });
  }
}

/** GET /api/dashboard/orders/by-table */
async function ordersByTable(req, res) {
  try {
    const venueId = req.venueId;
    const eventId = req.query.eventId || null;
    const where = { venueId, status: 'open' };
    if (eventId) where.eventId = eventId;

    const orders = await Order.findAll({
      where,
      include: [
        { model: VenueTable, as: 'table' },
        { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] },
      ],
    });

    const byTable = {};
    for (const o of orders) {
      const key = o.tableId || 'sin_mesa';
      if (!byTable[key]) byTable[key] = { mesa: o.table, totalRD: 0, ordenes: [] };
      byTable[key].totalRD += Number(o.total);
      byTable[key].ordenes.push(o);
    }

    return res.json({ porMesa: byTable });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error al agrupar por mesa' });
  }
}

/** GET /api/dashboard/staff */
async function listStaff(req, res) {
  try {
    const venueId = req.venueId;
    const list = await VenueStaff.findAll({
      where: { venueId },
      include: [{ model: User, as: 'user', attributes: ['id', 'fullName', 'email', 'phone'] }],
    });
    return res.json({ data: list });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error al listar personal' });
  }
}

/** POST /api/dashboard/staff */
async function addStaff(req, res) {
  try {
    const venueId = req.venueId;
    const { userId, staffRole, commissionPercent } = req.body;
    if (!userId || !staffRole) return res.status(400).json({ error: 'userId y staffRole son obligatorios' });
    const u = await User.findByPk(userId);
    if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });
    const [vs, created] = await VenueStaff.findOrCreate({
      where: { venueId, userId },
      defaults: {
        staffRole,
        commissionPercent: commissionPercent ?? 0,
        active: true,
      },
    });
    if (!created) {
      vs.staffRole = staffRole;
      vs.commissionPercent = commissionPercent ?? vs.commissionPercent;
      vs.active = true;
      await vs.save();
    }
    const full = await VenueStaff.findByPk(vs.id, {
      include: [{ model: User, as: 'user', attributes: ['id', 'fullName', 'email'] }],
    });
    return res.status(created ? 201 : 200).json(full);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error al agregar personal' });
  }
}

/** DELETE /api/dashboard/staff/:id */
async function removeStaff(req, res) {
  try {
    const venueId = req.venueId;
    const vs = await VenueStaff.findOne({ where: { id: req.params.id, venueId } });
    if (!vs) return res.status(404).json({ error: 'Registro no encontrado' });
    vs.active = false;
    await vs.save();
    return res.json({ ok: true, id: vs.id });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error al eliminar personal' });
  }
}

/** GET ventas por camarero — dentro de reports o staff; user asked sales by waiter in staff section - add GET /dashboard/staff/sales */
async function staffSales(req, res) {
  try {
    const venueId = req.venueId;
    const r = rangesNow();
    const start = req.query.from ? new Date(req.query.from) : r.month.start;
    const end = req.query.to ? new Date(req.query.to) : r.month.end;

    const rows = await sequelize.query(
      `
      SELECT o.waiter_id AS "waiterId", u.full_name AS "nombre", COALESCE(SUM(o.total),0)::decimal AS total
      FROM orders o
      LEFT JOIN users u ON o.waiter_id = u.id
      WHERE o.venue_id = :venueId
      AND o.status = 'paid'
      AND o.created_at BETWEEN :start AND :end
      AND o.waiter_id IS NOT NULL
      GROUP BY o.waiter_id, u.full_name
      ORDER BY total DESC
    `,
      { replacements: { venueId, start, end }, type: QueryTypes.SELECT }
    );

    return res.json({ data: rows, periodo: { from: start, to: end } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error al calcular ventas por camarero' });
  }
}

/** GET /api/dashboard/reports */
async function getReports(req, res) {
  try {
    const venueId = req.venueId;
    const end = endOfDay(new Date());
    const start = startOfDay(addDays(end, -29));

    const daily = await sequelize.query(
      `
      SELECT date_trunc('day', p.created_at)::date AS day,
             COALESCE(SUM(p.amount),0)::decimal AS total
      FROM payments p
      LEFT JOIN orders o ON p.order_id = o.id
      LEFT JOIN reservations r ON p.reservation_id = r.id
      LEFT JOIN events e ON r.event_id = e.id
      WHERE p.status = 'completed'
      AND p.created_at BETWEEN :start AND :end
      AND (o.venue_id = :venueId OR e.venue_id = :venueId)
      GROUP BY 1
      ORDER BY 1 ASC
    `,
      { replacements: { venueId, start, end }, type: QueryTypes.SELECT }
    );

    const byEvent = await sequelize.query(
      `
      SELECT e.id, e.title,
             COALESCE(SUM(p.amount),0)::decimal AS total
      FROM events e
      LEFT JOIN reservations r ON r.event_id = e.id
      LEFT JOIN payments p ON p.reservation_id = r.id AND p.status = 'completed'
      WHERE e.venue_id = :venueId
      GROUP BY e.id, e.title
      ORDER BY total DESC NULLS LAST
      LIMIT 20
    `,
      { replacements: { venueId }, type: QueryTypes.SELECT }
    );

    const methods = await sequelize.query(
      `
      SELECT p.method, COALESCE(SUM(p.amount),0)::decimal AS total
      FROM payments p
      LEFT JOIN orders o ON p.order_id = o.id
      LEFT JOIN reservations r ON p.reservation_id = r.id
      LEFT JOIN events e ON r.event_id = e.id
      WHERE p.status = 'completed'
      AND (o.venue_id = :venueId OR e.venue_id = :venueId)
      GROUP BY p.method
    `,
      { replacements: { venueId }, type: QueryTypes.SELECT }
    );

    const waiterRank = await sequelize.query(
      `
      SELECT u.full_name AS nombre, COALESCE(SUM(o.total),0)::decimal AS ventas
      FROM orders o
      LEFT JOIN users u ON o.waiter_id = u.id
      WHERE o.venue_id = :venueId AND o.status = 'paid' AND o.waiter_id IS NOT NULL
      GROUP BY u.full_name
      ORDER BY ventas DESC
      LIMIT 10
    `,
      { replacements: { venueId }, type: QueryTypes.SELECT }
    );

    const eventRows = await Event.findAll({ where: { venueId }, attributes: ['id'] });
    const eids = eventRows.map((e) => e.id);
    const reservasSum =
      eids.length > 0
        ? await Reservation.sum('totalAmount', { where: { eventId: { [Op.in]: eids } } })
        : 0;
    const ticketsSum =
      eids.length > 0
        ? await Ticket.sum('unitPrice', { where: { eventId: { [Op.in]: eids } } })
        : 0;
    const posSum = await Order.sum('total', { where: { venueId, status: 'paid' } });

    return res.json({
      exportable: true,
      formato: 'json',
      ventasDiariasUltimos30: daily,
      ventasPorEvento: byEvent,
      metodosDePago: methods,
      rankingCamareros: waiterRank,
      ingresosPorTipoRD: {
        reservas: Number(reservasSum || 0),
        tickets: Number(ticketsSum || 0),
        consumosPOS: Number(posSum || 0),
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error al generar reportes' });
  }
}

/** GET /api/dashboard/cash-closing */
async function listCashClosings(req, res) {
  try {
    const venueId = req.venueId;
    const rows = await CashClosing.findAll({
      where: { venueId },
      include: [
        { model: Event, as: 'event', attributes: ['id', 'title'] },
        { model: User, as: 'closedBy', attributes: ['id', 'fullName'], required: false },
      ],
      order: [['createdAt', 'DESC']],
      limit: 100,
    });
    return res.json({ data: rows });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error al listar cierres' });
  }
}

/** POST /api/dashboard/cash-closing */
async function createCashClosing(req, res) {
  try {
    const venueId = req.venueId;
    const {
      eventId,
      cashTotal,
      cardTotal,
      transferTotal,
      otherTotal,
      notes,
      metadata,
    } = req.body;
    const c = Number(cashTotal || 0);
    const d = Number(cardTotal || 0);
    const t = Number(transferTotal || 0);
    const o = Number(otherTotal || 0);
    const grand = c + d + t + o;

    const row = await CashClosing.create({
      venueId,
      eventId: eventId || null,
      closedByUserId: req.userId,
      cashTotal: c,
      cardTotal: d,
      transferTotal: t,
      otherTotal: o,
      grandTotal: grand,
      notes: notes || null,
      metadata: metadata || null,
    });

    let balanceEventoRD = null;
    if (eventId) {
      const ev = await Event.findOne({ where: { id: eventId, venueId } });
      if (ev) {
        balanceEventoRD = await sumPaymentRevenue(venueId, ev.startAt, ev.endAt);
      }
    }

    return res.status(201).json({
      cierre: row,
      balanceEventoRD,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error al registrar cierre de caja' });
  }
}

module.exports = {
  getMineVenue,
  getStats,
  listReservations,
  listTickets,
  listDashboardEvents,
  createDashboardEvent,
  updateDashboardEvent,
  cancelDashboardEvent,
  listDashboardTables,
  createDashboardTable,
  updateDashboardTable,
  deactivateDashboardTable,
  listDashboardOrders,
  createDashboardOrder,
  addDashboardOrderItems,
  closeDashboardOrder,
  ordersByTable,
  listStaff,
  addStaff,
  removeStaff,
  staffSales,
  getReports,
  listCashClosings,
  createCashClosing,
};
