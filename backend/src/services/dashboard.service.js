const { Op, QueryTypes } = require('sequelize');
const {
  sequelize,
  Venue,
  Event,
  VenueTable,
  Reservation,
  Ticket,
  Order,
  Payment,
  User,
  VenueStaff,
  CashClosing,
} = require('../models');
const { rangesNow, pctChange, startOfDay, endOfDay, addDays } = require('../controllers/dashboardHelpers');

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

async function sumCashClosingGrandTotal(venueId, start, end, eventId) {
  const where = { venueId, createdAt: { [Op.between]: [start, end] } };
  if (eventId) where.eventId = eventId;
  const sum = await CashClosing.sum('grandTotal', { where });
  return Number(sum || 0);
}

async function queryCashClosingGrandByDay(venueId, from, to, eventId) {
  const eventClause = eventId ? 'AND cc.event_id = :eventId' : '';
  const rows = await sequelize.query(
    `
    SELECT date_trunc('day', cc.created_at)::date AS day, COALESCE(SUM(cc.grand_total), 0)::decimal AS total
    FROM cash_closings cc
    WHERE cc.venue_id = :venueId
    AND cc.created_at BETWEEN :from AND :to
    ${eventClause}
    GROUP BY 1
    ORDER BY 1 ASC
  `,
    { replacements: { venueId, from, to, ...(eventId ? { eventId } : {}) }, type: QueryTypes.SELECT }
  );
  return rows.map((r) => ({ day: r.day, total: Number(r.total || 0) }));
}

function mergeDailySalesDigitalManual(digitalRows, manualRows) {
  const map = new Map();
  for (const r of digitalRows) {
    const k = String(r.day);
    map.set(k, Number(r.total || 0));
  }
  for (const r of manualRows) {
    const k = String(r.day);
    map.set(k, (map.get(k) || 0) + Number(r.total || 0));
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([day, total]) => ({ day, total: Number(Number(total).toFixed(2)) }));
}

function emptyChannelBreakdown() {
  return {
    entradas: { cash: 0, card: 0, transfer: 0, other: 0, total: 0 },
    mesas: { cash: 0, card: 0, transfer: 0, other: 0, total: 0 },
    consumo: { cash: 0, card: 0, transfer: 0, other: 0, total: 0 },
  };
}

function addAmountToChannel(out, channel, method, amount) {
  const ch = channel === 'mesas' ? 'mesas' : channel === 'entradas' ? 'entradas' : channel === 'consumo' ? 'consumo' : null;
  if (!ch || !out[ch]) return;
  const n = Number(amount || 0);
  const m = String(method || 'other').toLowerCase();
  if (m === 'cash') out[ch].cash += n;
  else if (m === 'card') out[ch].card += n;
  else if (m === 'transfer') out[ch].transfer += n;
  else out[ch].other += n;
  out[ch].total += n;
}

function finalizeChannelTotals(out) {
  for (const k of Object.keys(out)) {
    const row = out[k];
    row.total = Number((row.cash + row.card + row.transfer + row.other).toFixed(2));
  }
  return out;
}

function mergeChannelBreakdowns(a, b) {
  const out = emptyChannelBreakdown();
  for (const src of [a, b]) {
    if (!src) continue;
    for (const ch of ['entradas', 'mesas', 'consumo']) {
      const row = src[ch];
      if (!row) continue;
      out[ch].cash += Number(row.cash || 0);
      out[ch].card += Number(row.card || 0);
      out[ch].transfer += Number(row.transfer || 0);
      out[ch].other += Number(row.other || 0);
    }
  }
  return finalizeChannelTotals(out);
}

function aggregateManualBreakdown(rows) {
  const out = emptyChannelBreakdown();
  for (const row of rows) {
    const meta = row.metadata;
    const bd = meta && typeof meta === 'object' ? meta.breakdown : null;
    if (bd && typeof bd === 'object') {
      for (const ch of ['entradas', 'mesas', 'consumo']) {
        const part = bd[ch];
        if (!part || typeof part !== 'object') continue;
        out[ch].cash += Number(part.cash || 0);
        out[ch].card += Number(part.card || 0);
        out[ch].transfer += Number(part.transfer || 0);
        out[ch].other += Number(part.other || 0);
      }
      continue;
    }
    /* Cierres antiguos sin desglose: contar todo como consumo para no perder el histórico manual. */
    out.consumo.cash += Number(row.cashTotal || 0);
    out.consumo.card += Number(row.cardTotal || 0);
    out.consumo.transfer += Number(row.transferTotal || 0);
    out.consumo.other += Number(row.otherTotal || 0);
  }
  return finalizeChannelTotals(out);
}

async function queryDigitalRevenueByChannel(venueId, from, to, eventId) {
  const eventClause = eventId
    ? 'AND ((o.id IS NOT NULL AND o.event_id = :eventId) OR (r.id IS NOT NULL AND r.event_id = :eventId))'
    : '';
  const rows = await sequelize.query(
    `
    SELECT
      CASE
        WHEN p.reservation_id IS NOT NULL THEN 'mesas'
        WHEN o.id IS NOT NULL AND o.type = 'tickets' THEN 'entradas'
        WHEN o.id IS NOT NULL THEN 'consumo'
        ELSE 'otro'
      END AS channel,
      p.method::text AS method,
      COALESCE(SUM(p.amount), 0)::decimal AS total
    FROM payments p
    LEFT JOIN orders o ON p.order_id = o.id
    LEFT JOIN reservations r ON p.reservation_id = r.id
    LEFT JOIN events e_res ON r.event_id = e_res.id
    WHERE p.status = 'completed'
    AND p.created_at BETWEEN :from AND :to
    AND (
      (o.id IS NOT NULL AND o.venue_id = :venueId)
      OR (r.id IS NOT NULL AND e_res.venue_id = :venueId)
    )
    ${eventClause}
    GROUP BY 1, 2
  `,
    {
      replacements: { venueId, from, to, ...(eventId ? { eventId } : {}) },
      type: QueryTypes.SELECT,
    }
  );
  const out = emptyChannelBreakdown();
  for (const row of rows) {
    addAmountToChannel(out, row.channel, row.method, row.total);
  }
  return finalizeChannelTotals(out);
}

async function sumManualChannelBreakdown(venueId, from, to, eventId) {
  const where = { venueId, createdAt: { [Op.between]: [from, to] } };
  if (eventId) where.eventId = eventId;
  const rows = await CashClosing.findAll({
    where,
    attributes: ['metadata', 'cashTotal', 'cardTotal', 'transferTotal', 'otherTotal'],
  });
  return aggregateManualBreakdown(rows);
}

async function revenueChannelsSnapshot({ venueId, from, to, eventId }) {
  const [digital, manualReported] = await Promise.all([
    queryDigitalRevenueByChannel(venueId, from, to, eventId || null),
    sumManualChannelBreakdown(venueId, from, to, eventId || null),
  ]);
  const combined = mergeChannelBreakdowns(digital, manualReported);
  const digitalGrand = Object.values(digital).reduce((s, x) => s + Number(x.total || 0), 0);
  const manualGrand = Object.values(manualReported).reduce((s, x) => s + Number(x.total || 0), 0);
  return {
    digital,
    manualReported,
    combined,
    grandDigitalRD: Number(digitalGrand.toFixed(2)),
    grandManualRD: Number(manualGrand.toFixed(2)),
    grandCombinedRD: Number((digitalGrand + manualGrand).toFixed(2)),
  };
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
    return { activeEvent: null, currentAttendees: 0, maxCapacity: venue.capacity || 0, ratio: 0 };
  }
  const partySum = await Reservation.sum('partySize', {
    where: { eventId: activeEvent.id, status: { [Op.in]: ['confirmed', 'checked_in', 'completed'] } },
  });
  const paidTickets = await Ticket.count({
    where: { eventId: activeEvent.id, status: { [Op.in]: ['paid', 'valid'] } },
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
  const [
    revT0,
    revT1,
    revW0,
    revW1,
    revM0,
    revM1,
    manT0,
    manT1,
    manW0,
    manW1,
    manM0,
    manM1,
  ] = await Promise.all([
    sumPaymentRevenue(venueId, r.today.start, r.today.end),
    sumPaymentRevenue(venueId, r.prevToday.start, r.prevToday.end),
    sumPaymentRevenue(venueId, r.week.start, r.week.end),
    sumPaymentRevenue(venueId, r.prevWeek.start, r.prevWeek.end),
    sumPaymentRevenue(venueId, r.month.start, r.month.end),
    sumPaymentRevenue(venueId, r.prevMonth.start, r.prevMonth.end),
    sumCashClosingGrandTotal(venueId, r.today.start, r.today.end, null),
    sumCashClosingGrandTotal(venueId, r.prevToday.start, r.prevToday.end, null),
    sumCashClosingGrandTotal(venueId, r.week.start, r.week.end, null),
    sumCashClosingGrandTotal(venueId, r.prevWeek.start, r.prevWeek.end, null),
    sumCashClosingGrandTotal(venueId, r.month.start, r.month.end, null),
    sumCashClosingGrandTotal(venueId, r.prevMonth.start, r.prevMonth.end, null),
  ]);
  const mT0 = revT0 + manT0;
  const mT1 = revT1 + manT1;
  const mW0 = revW0 + manW0;
  const mW1 = revW1 + manW1;
  const mM0 = revM0 + manM0;
  const mM1 = revM1 + manM1;
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
      totalRD: { today: mT0, week: mW0, month: mM0 },
      changeVsPrevious: {
        todayPct: pctChange(mT0, mT1),
        weekPct: pctChange(mW0, mW1),
        monthPct: pctChange(mM0, mM1),
      },
    },
  };
}

async function getMineVenue({ user, userId, query }) {
  if (!['venue_owner', 'admin'].includes(user.role)) {
    const err = new Error('Solo dueños de local o administradores');
    err.status = 403;
    throw err;
  }
  let venue;
  if (user.role === 'admin') {
    if (!query.venueId) {
      const venues = await Venue.findAll({
        attributes: ['id', 'name', 'city', 'status', 'slug'],
        order: [['name', 'ASC']],
        include: [{ model: User, as: 'owner', attributes: ['id', 'fullName', 'email'] }],
        limit: 500,
      });
      return { venue: null, stats: null, needsVenuePick: true, venues, viewerRole: 'admin' };
    }
    venue = await Venue.findByPk(query.venueId, {
      include: [{ model: User, as: 'owner', attributes: ['id', 'fullName', 'email'] }],
    });
  } else {
    venue = await Venue.findOne({
      where: { ownerId: userId },
      order: [['createdAt', 'ASC']],
      include: [{ model: User, as: 'owner', attributes: ['id', 'fullName', 'email'] }],
    });
  }
  if (!venue && user.role === 'venue_owner') {
    return { venue: null, stats: null, needsVenue: true, viewerRole: 'venue_owner' };
  }
  if (!venue) {
    const err = new Error('Local no encontrado');
    err.status = 404;
    throw err;
  }
  const r = rangesNow();
  const stats = await buildPeriodStats(venue.id, r);
  const activeEvents = await Event.count({
    where: { venueId: venue.id, status: 'published', endAt: { [Op.gte]: new Date() } },
  });
  const occ = await occupancySnapshot(venue);
  return {
    venue,
    stats: { ...stats, activeEvents, occupancy: occ },
    viewerRole: user.role,
  };
}

async function getStats({ venueId, venue }) {
  const r = rangesNow();
  const base = await buildPeriodStats(venueId, r);
  const activeEvents = await Event.count({
    where: { venueId, status: 'published', endAt: { [Op.gte]: new Date() } },
  });
  const occ = await occupancySnapshot(venue);
  return {
    venueId,
    period: {
      today: { from: r.today.start, to: r.today.end },
      week: { from: r.week.start, to: r.week.end },
      month: { from: r.month.start, to: r.month.end },
    },
    ...base,
    activeEvents,
    occupancy: occ,
  };
}

async function computeTableStatus(tableId, eventId) {
  if (!eventId) return 'libre';
  const openOrder = await Order.findOne({ where: { tableId, eventId, status: 'open' } });
  if (openOrder) return 'ocupada';
  const resv = await Reservation.findOne({
    where: { tableId, eventId, status: { [Op.notIn]: ['cancelled'] } },
    order: [['createdAt', 'DESC']],
  });
  if (!resv) return 'libre';
  if (['pending', 'confirmed'].includes(resv.status)) return 'reservada';
  if (['checked_in', 'completed'].includes(resv.status)) return 'ocupada';
  return 'libre';
}

async function listDashboardTables({ venueId, query }) {
  const eventId = query.eventId || null;
  const zone = query.zone || null;
  const where = { venueId };
  if (zone) where.zone = zone;
  if (eventId && query.tableScope === 'event') where.eventId = eventId;
  const tables = await VenueTable.findAll({ where, order: [['zone', 'ASC'], ['label', 'ASC']] });
  const withStatus = await Promise.all(
    tables.map(async (t) => ({
      ...t.toJSON(),
      estadoEnEvento: eventId ? await computeTableStatus(t.id, eventId) : null,
    }))
  );
  const byZone = {};
  for (const row of withStatus) {
    if (!byZone[row.zone]) byZone[row.zone] = [];
    byZone[row.zone].push(row);
  }
  return { zonas: byZone, mesas: withStatus };
}

function clampInitialPaymentPercent(v) {
  if (v === undefined || v === null || v === '') return 50;
  const n = Number(v);
  if (!Number.isFinite(n)) return 50;
  return Math.max(1, Math.min(100, Math.round(n)));
}

async function createDashboardTable({ venueId, body }) {
  return VenueTable.create({
    venueId,
    eventId: body.eventId || null,
    zone: body.zone || 'General',
    label: body.label,
    capacity: body.capacity ?? 4,
    minPrice: body.minPrice ?? null,
    initialPaymentPercent: clampInitialPaymentPercent(body.initialPaymentPercent),
    posX: body.posX ?? 0,
    posY: body.posY ?? 0,
    active: body.active !== false,
  });
}

async function updateDashboardTable({ venueId, tableId, body }) {
  const t = await VenueTable.findOne({ where: { id: tableId, venueId } });
  if (!t) {
    const err = new Error('Mesa no encontrada');
    err.status = 404;
    throw err;
  }
  const keys = ['zone', 'label', 'capacity', 'minPrice', 'posX', 'posY', 'active', 'eventId'];
  for (const k of keys) if (body[k] !== undefined) t[k] = body[k];
  if (body.initialPaymentPercent !== undefined) {
    t.initialPaymentPercent = clampInitialPaymentPercent(body.initialPaymentPercent);
  }
  await t.save();
  return t;
}

async function deactivateDashboardTable({ venueId, tableId }) {
  const t = await VenueTable.findOne({ where: { id: tableId, venueId } });
  if (!t) {
    const err = new Error('Mesa no encontrada');
    err.status = 404;
    throw err;
  }
  t.active = false;
  await t.save();
  return { ok: true, id: t.id, active: t.active };
}

async function listStaff({ venueId }) {
  const data = await VenueStaff.findAll({
    where: { venueId },
    include: [{ model: User, as: 'user', attributes: ['id', 'fullName', 'email', 'phone'] }],
  });
  return { data };
}

async function addStaff({ venueId, body }) {
  const { userId, staffRole, commissionPercent } = body;
  if (!userId || !staffRole) {
    const err = new Error('userId y staffRole son obligatorios');
    err.status = 400;
    throw err;
  }
  const u = await User.findByPk(userId);
  if (!u) {
    const err = new Error('Usuario no encontrado');
    err.status = 404;
    throw err;
  }
  const [vs, created] = await VenueStaff.findOrCreate({
    where: { venueId, userId },
    defaults: { staffRole, commissionPercent: commissionPercent ?? 0, active: true },
  });
  if (!created) {
    vs.staffRole = staffRole;
    vs.commissionPercent = commissionPercent ?? vs.commissionPercent;
    vs.active = true;
    await vs.save();
  }
  return VenueStaff.findByPk(vs.id, {
    include: [{ model: User, as: 'user', attributes: ['id', 'fullName', 'email'] }],
  });
}

async function removeStaff({ venueId, staffId }) {
  const vs = await VenueStaff.findOne({ where: { id: staffId, venueId } });
  if (!vs) {
    const err = new Error('Registro no encontrado');
    err.status = 404;
    throw err;
  }
  vs.active = false;
  await vs.save();
  return { ok: true, id: vs.id };
}

async function staffSales({ venueId, query }) {
  const r = rangesNow();
  const start = query.from ? new Date(query.from) : r.month.start;
  const end = query.to ? new Date(query.to) : r.month.end;
  const data = await sequelize.query(
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
  return { data, periodo: { from: start, to: end } };
}

async function getReports({ venueId }) {
  const end = endOfDay(new Date());
  const start = startOfDay(addDays(end, -29));
  const daily = await sequelize.query(
    `
      SELECT date_trunc('day', p.created_at)::date AS day, COALESCE(SUM(p.amount),0)::decimal AS total
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
      SELECT e.id, e.title, COALESCE(SUM(p.amount),0)::decimal AS total
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
    eids.length > 0 ? await Reservation.sum('totalAmount', { where: { eventId: { [Op.in]: eids } } }) : 0;
  const ticketsSum =
    eids.length > 0 ? await Ticket.sum('unitPrice', { where: { eventId: { [Op.in]: eids } } }) : 0;
  const posSum = await Order.sum('total', { where: { venueId, status: 'paid' } });
  return {
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
  };
}

async function listCashClosings({ venueId }) {
  const data = await CashClosing.findAll({
    where: { venueId },
    include: [
      { model: Event, as: 'event', attributes: ['id', 'title'] },
      { model: User, as: 'closedBy', attributes: ['id', 'fullName'], required: false },
    ],
    order: [['createdAt', 'DESC']],
    limit: 100,
  });
  return { data };
}

async function createCashClosing({ venueId, userId, body }) {
  const { eventId, cashTotal, cardTotal, transferTotal, otherTotal, notes, metadata, breakdown } = body;
  const c = Number(cashTotal || 0);
  const d = Number(cardTotal || 0);
  const t = Number(transferTotal || 0);
  const o = Number(otherTotal || 0);
  const grand = c + d + t + o;
  let meta = null;
  if (metadata && typeof metadata === 'object') {
    meta = { ...metadata };
  }
  if (breakdown && typeof breakdown === 'object') {
    meta = { ...(meta || {}), breakdown, breakdownVersion: 1 };
  }
  const cierre = await CashClosing.create({
    venueId,
    eventId: eventId || null,
    closedByUserId: userId,
    cashTotal: c,
    cardTotal: d,
    transferTotal: t,
    otherTotal: o,
    grandTotal: grand,
    notes: notes || null,
    metadata: meta,
  });
  let balanceEventoRD = null;
  if (eventId) {
    const ev = await Event.findOne({ where: { id: eventId, venueId } });
    if (ev) balanceEventoRD = await sumPaymentRevenue(venueId, ev.startAt, ev.endAt);
  }
  return { cierre, balanceEventoRD };
}

function periodStartFor(range) {
  const now = new Date();
  if (range === '7d') return startOfDay(addDays(now, -6));
  if (range === '30d') return startOfDay(addDays(now, -29));
  return new Date('2000-01-01T00:00:00.000Z');
}

async function getAnalytics({ venueId, venue, query }) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const range = query.range === '7d' || query.range === '30d' ? query.range : '30d';
  const from = periodStartFor(range);
  const to = endOfDay(now);
  const eventId = query.eventId || null;

  const eventWhere = { venueId };
  if (eventId) eventWhere.id = eventId;
  const events = await Event.findAll({ where: eventWhere, attributes: ['id', 'title', 'maxCapacity', 'startAt', 'endAt'] });
  const eventIds = events.map((e) => e.id);

  const ticketToday = eventIds.length
    ? await Ticket.count({ where: { eventId: { [Op.in]: eventIds }, createdAt: { [Op.between]: [todayStart, todayEnd] } } })
    : 0;
  const ticketTotal = eventIds.length ? await Ticket.count({ where: { eventId: { [Op.in]: eventIds } } }) : 0;

  const resToday = eventIds.length
    ? await Reservation.count({
        where: { eventId: { [Op.in]: eventIds }, createdAt: { [Op.between]: [todayStart, todayEnd] } },
      })
    : 0;
  const resTotal = eventIds.length ? await Reservation.count({ where: { eventId: { [Op.in]: eventIds } } }) : 0;

  const yStart = startOfDay(addDays(now, -1));
  const yEnd = endOfDay(addDays(now, -1));
  const epoch = new Date('2000-01-01T00:00:00.000Z');

  const [
    revenueTodayDigital,
    manualToday,
    revenueYesterdayDigital,
    manualYesterday,
    revenueTotalDigital,
    manualAllTime,
  ] = await Promise.all([
    sumPaymentRevenue(venueId, todayStart, todayEnd),
    sumCashClosingGrandTotal(venueId, todayStart, todayEnd, eventId),
    sumPaymentRevenue(venueId, yStart, yEnd),
    sumCashClosingGrandTotal(venueId, yStart, yEnd, eventId),
    sumPaymentRevenue(venueId, epoch, todayEnd),
    sumCashClosingGrandTotal(venueId, epoch, todayEnd, eventId),
  ]);
  const revenueToday = revenueTodayDigital + manualToday;
  const revenueYesterday = revenueYesterdayDigital + manualYesterday;
  const revenueTotal = revenueTotalDigital + manualAllTime;

  const occ = await occupancySnapshot(venue);

  const [salesRows, manualByDay] = await Promise.all([
    sequelize.query(
      `
      SELECT date_trunc('day', p.created_at)::date AS day, COALESCE(SUM(p.amount), 0)::decimal AS total
      FROM payments p
      LEFT JOIN orders o ON p.order_id = o.id
      LEFT JOIN reservations r ON p.reservation_id = r.id
      LEFT JOIN events e ON r.event_id = e.id
      WHERE p.status = 'completed'
      AND p.created_at BETWEEN :from AND :to
      AND (o.venue_id = :venueId OR e.venue_id = :venueId)
      GROUP BY 1
      ORDER BY 1 ASC
    `,
      { replacements: { from, to, venueId }, type: QueryTypes.SELECT }
    ),
    queryCashClosingGrandByDay(venueId, from, to, eventId),
  ]);

  const salesByDayDigital = salesRows.map((r) => ({ day: r.day, total: Number(r.total || 0) }));
  const salesByDay = mergeDailySalesDigitalManual(salesByDayDigital, manualByDay);

  const entriesVsTables = await Promise.all(
    events.map(async (ev) => {
      const [tickets, mesas] = await Promise.all([
        Ticket.count({ where: { eventId: ev.id } }),
        Reservation.count({ where: { eventId: ev.id, status: { [Op.notIn]: ['cancelled', 'no_show'] } } }),
      ]);
      return { eventId: ev.id, eventTitle: ev.title, tickets, tables: mesas };
    })
  );

  const revenueByEvent = await Promise.all(
    events.map(async (ev) => {
      const [tix, res, cierreEv] = await Promise.all([
        Ticket.sum('unitPrice', { where: { eventId: ev.id, status: { [Op.not]: 'cancelled' } } }),
        Reservation.sum('totalAmount', { where: { eventId: ev.id, status: { [Op.not]: 'cancelled' } } }),
        CashClosing.sum('grandTotal', { where: { venueId, eventId: ev.id } }),
      ]);
      return {
        eventId: ev.id,
        eventTitle: ev.title,
        total: Number(tix || 0) + Number(res || 0) + Number(cierreEv || 0),
      };
    })
  );

  const top5Events = [...entriesVsTables].sort((a, b) => b.tickets - a.tickets).slice(0, 5);

  const occupancyByEvent = await Promise.all(
    events.map(async (ev) => {
      const [party, tix] = await Promise.all([
        Reservation.sum('partySize', {
          where: { eventId: ev.id, status: { [Op.in]: ['confirmed', 'checked_in', 'completed', 'pending'] } },
        }),
        Ticket.count({ where: { eventId: ev.id, status: { [Op.in]: ['paid', 'valid', 'used'] } } }),
      ]);
      const attended = Number(party || 0) + Number(tix || 0);
      const capacity = Number(ev.maxCapacity || venue.capacity || 0);
      const occupancyRate = capacity > 0 ? Number(((attended / capacity) * 100).toFixed(2)) : 0;
      return { eventId: ev.id, eventTitle: ev.title, capacity, attended, occupancyRate };
    })
  );

  const revenueChannels = await revenueChannelsSnapshot({
    venueId,
    from,
    to,
    eventId: eventId || null,
  });

  return {
    summary: {
      tickets: { today: ticketToday, total: ticketTotal, deltaVsYesterday: ticketToday - Math.max(ticketTotal - ticketToday, 0) },
      reservations: { today: resToday, total: resTotal, deltaVsYesterday: resToday - Math.max(resTotal - resToday, 0) },
      revenue: {
        today: revenueToday,
        total: revenueTotal,
        deltaVsYesterday: Number((revenueToday - revenueYesterday).toFixed(2)),
      },
      occupancyCurrent: {
        currentAttendees: occ.currentAttendees,
        maxCapacity: occ.maxCapacity,
        ratio: occ.ratio,
        percentage: Math.round((occ.ratio || 0) * 100),
      },
    },
    charts: {
      salesByDay,
      entriesVsTables,
      revenueByEvent: revenueByEvent.sort((a, b) => b.total - a.total),
    },
    tables: {
      top5Events,
      occupancyByEvent: occupancyByEvent.sort((a, b) => b.occupancyRate - a.occupancyRate),
    },
    revenueChannels,
    filter: { range, eventId },
  };
}

module.exports = {
  getMineVenue,
  getStats,
  listDashboardTables,
  createDashboardTable,
  updateDashboardTable,
  deactivateDashboardTable,
  listStaff,
  addStaff,
  removeStaff,
  staffSales,
  getReports,
  getAnalytics,
  listCashClosings,
  createCashClosing,
};
