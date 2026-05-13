const { QueryTypes } = require('sequelize');
const { Op } = require('sequelize');
const {
  sequelize,
  User,
  Venue,
  Payment,
  Order,
  Reservation,
  Event,
  Ticket,
  VenueTable,
} = require('../models');
const { reservationPaymentSplit } = require('./reservations.service');

function asMoneyNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function sqlAdminPaymentVenueNet(alias = 'p') {
  return `(
    CASE
      WHEN ${alias}.order_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM tickets t WHERE t.order_id = ${alias}.order_id AND t.status <> 'cancelled'
      ) THEN
        COALESCE((
          SELECT SUM(t.unit_price::decimal)
          FROM tickets t
          WHERE t.order_id = ${alias}.order_id AND t.status <> 'cancelled'
        ), ${alias}.amount::decimal)
      ELSE ${alias}.amount::decimal
    END
  )`;
}

function adminRevenueSourcesQuery({ ticketWhere = '', reservationWhere = '' } = {}) {
  return `
    WITH ticket_revenue AS (
      SELECT
        v.id AS "venueId",
        COALESCE(v.name, 'Sin local') AS "venueName",
        v.city AS "venueCity",
        COALESCE(SUM(t.unit_price::decimal), 0)::decimal AS "ticketsGross",
        0::decimal AS "reservationsGross"
      FROM tickets t
      JOIN events e ON e.id = t.event_id
      JOIN venues v ON v.id = e.venue_id
      WHERE t.status <> 'cancelled'
      ${ticketWhere}
      GROUP BY v.id, v.name, v.city
    ),
    reservation_revenue AS (
      SELECT
        v.id AS "venueId",
        COALESCE(v.name, 'Sin local') AS "venueName",
        v.city AS "venueCity",
        0::decimal AS "ticketsGross",
        COALESCE(SUM(r.total_amount::decimal), 0)::decimal AS "reservationsGross"
      FROM reservations r
      JOIN events e ON e.id = r.event_id
      JOIN venues v ON v.id = e.venue_id
      WHERE r.status NOT IN ('cancelled', 'no_show')
      ${reservationWhere}
      GROUP BY v.id, v.name, v.city
    ),
    combined AS (
      SELECT * FROM ticket_revenue
      UNION ALL
      SELECT * FROM reservation_revenue
    )
    SELECT
      "venueId",
      "venueName",
      "venueCity",
      COALESCE(SUM("reservationsGross"), 0)::decimal AS "reservationsGross",
      COALESCE(SUM("ticketsGross"), 0)::decimal AS "ticketsGross",
      COALESCE(SUM("reservationsGross" + "ticketsGross"), 0)::decimal AS "totalControlledGross",
      COALESCE(SUM(("reservationsGross" * 0.05) + ("ticketsGross" * 0.10)), 0)::decimal AS "totalControlledCommission",
      COALESCE(SUM("reservationsGross" * 0.05), 0)::decimal AS "reservationsCommission",
      COALESCE(SUM("ticketsGross" * 0.10), 0)::decimal AS "ticketsCommission"
    FROM combined
    GROUP BY "venueId", "venueName", "venueCity"
  `;
}

async function dashboardSummary() {
  const net = sqlAdminPaymentVenueNet('p');
  const [
    users,
    usersByRoleRows,
    venuesPending,
    venuesApproved,
    venuesSuspended,
    eventsTotal,
    eventsPublished,
    eventsDraft,
    paymentsSum,
    commissionRows,
    controlledRevenueRows,
    issueRows,
    topVenueRows,
  ] = await Promise.all([
    User.count(),
    User.findAll({
      attributes: [
        'role',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: ['role'],
      raw: true,
    }),
    Venue.count({ where: { status: 'pending' } }),
    Venue.count({ where: { status: 'approved' } }),
    Venue.count({ where: { status: 'suspended' } }),
    Event.count(),
    Event.count({ where: { status: 'published' } }),
    Event.count({ where: { status: 'draft' } }),
    Payment.sum('amount', { where: { status: 'completed' } }),
    sequelize.query(
      `
      SELECT COALESCE(SUM((p.amount::decimal - ${net})), 0)::decimal AS total
      FROM payments p
      WHERE p.status = 'completed'
    `,
      {
        replacements: {},
        type: QueryTypes.SELECT,
      }
    ),
    sequelize.query(
      `
      SELECT
        COALESCE(SUM("reservationsGross"), 0)::decimal AS "reservationsGross",
        COALESCE(SUM("ticketsGross"), 0)::decimal AS "ticketsGross",
        COALESCE(SUM("totalControlledGross"), 0)::decimal AS "localRevenue"
      FROM (${adminRevenueSourcesQuery()}) src
    `,
      { type: QueryTypes.SELECT }
    ),
    sequelize.query(
      `
      SELECT
        (SELECT COUNT(*) FROM payments WHERE status = 'pending')::int AS "pendingPayments",
        (SELECT COUNT(*) FROM payments WHERE status = 'failed')::int AS "failedPayments",
        (SELECT COUNT(*) FROM orders WHERE ticket_email_send_error IS NOT NULL AND ticket_email_send_error <> '')::int AS "ticketEmailErrors",
        (
          SELECT COUNT(*)
          FROM reservations r
          WHERE r.status = 'pending'
            AND EXISTS (
              SELECT 1
              FROM payments p
              WHERE p.reservation_id = r.id
                AND p.status = 'completed'
            )
        )::int AS "paidReservationsStillPending",
        (
          SELECT COUNT(*)
          FROM venues v
          LEFT JOIN users u ON u.id = v.owner_id
          WHERE u.id IS NULL
        )::int AS "venuesWithoutOwner",
        (
          SELECT COUNT(*)
          FROM events e
          WHERE e.status = 'published'
            AND NOT EXISTS (
              SELECT 1 FROM event_ticket_types ett WHERE ett.event_id = e.id
            )
            AND NOT EXISTS (
              SELECT 1 FROM venue_tables vt WHERE vt.event_id = e.id
            )
        )::int AS "publishedEventsWithoutSalesConfig"
    `,
      { type: QueryTypes.SELECT }
    ),
    sequelize.query(
      `
      SELECT
        "venueId",
        "venueName",
        "venueCity",
        "totalControlledGross" AS "localRevenue",
        "reservationsGross",
        "ticketsGross"
      FROM (${adminRevenueSourcesQuery()}) src
      WHERE "totalControlledGross" > 0
      ORDER BY "totalControlledGross" DESC
      LIMIT 5
    `,
      { type: QueryTypes.SELECT }
    ),
  ]);
  const commissionSum = Number(commissionRows[0]?.total || 0);
  const controlled = controlledRevenueRows[0] || {};
  const reservationsGross = Number(controlled.reservationsGross || 0);
  const ticketsGross = Number(controlled.ticketsGross || 0);
  const localRevenueRD = Number(controlled.localRevenue || 0);
  const estimatedTicketsCommissionRD = Number((ticketsGross * 0.1).toFixed(2));
  const estimatedReservationsCommissionRD = Number((reservationsGross * 0.05).toFixed(2));
  const estimatedAppCommissionsRD = Number(
    (estimatedTicketsCommissionRD + estimatedReservationsCommissionRD).toFixed(2)
  );
  const usersByRole = usersByRoleRows.reduce((acc, row) => {
    acc[row.role || 'unknown'] = Number(row.count || 0);
    return acc;
  }, {});
  const issues = issueRows[0] || {};
  const operationsIssuesTotal =
    Number(venuesPending || 0) +
    Number(issues.pendingPayments || 0) +
    Number(issues.failedPayments || 0) +
    Number(issues.ticketEmailErrors || 0) +
    Number(issues.paidReservationsStillPending || 0) +
    Number(issues.venuesWithoutOwner || 0) +
    Number(issues.publishedEventsWithoutSalesConfig || 0);
  return {
    totalUsers: users,
    usersByRole,
    venuesPending,
    venuesApproved,
    venuesSuspended,
    eventsTotal,
    eventsPublished,
    eventsDraft,
    totalVolumeRD: paymentsSum || 0,
    platformCommissionsRD: estimatedAppCommissionsRD,
    actualStoredCommissionsRD: commissionSum,
    localRevenueRD,
    reservationsGrossRD: reservationsGross,
    ticketsGrossRD: ticketsGross,
    estimatedTicketsCommissionRD,
    estimatedReservationsCommissionRD,
    estimatedAppCommissionsRD,
    commissionPolicy: {
      ticketsPercent: 10,
      reservationsPercent: 5,
    },
    issues: {
      total: operationsIssuesTotal,
      pendingVenues: Number(venuesPending || 0),
      pendingPayments: Number(issues.pendingPayments || 0),
      failedPayments: Number(issues.failedPayments || 0),
      ticketEmailErrors: Number(issues.ticketEmailErrors || 0),
      paidReservationsStillPending: Number(issues.paidReservationsStillPending || 0),
      venuesWithoutOwner: Number(issues.venuesWithoutOwner || 0),
      publishedEventsWithoutSalesConfig: Number(issues.publishedEventsWithoutSalesConfig || 0),
    },
    topVenues: topVenueRows.map((row) => {
      const rowReservationsGross = Number(row.reservationsGross || 0);
      const rowTicketsGross = Number(row.ticketsGross || 0);
      return {
        venueId: row.venueId,
        venueName: row.venueName || 'Sin local',
        venueCity: row.venueCity || null,
        localRevenueRD: Number(row.localRevenue || 0),
        appCommissionRD: Number(((rowTicketsGross * 0.1) + (rowReservationsGross * 0.05)).toFixed(2)),
      };
    }),
  };
}

async function listPendingVenues() {
  return Venue.findAll({
    where: { status: 'pending' },
    include: [{ model: User, as: 'owner', attributes: ['id', 'email', 'fullName', 'phone'] }],
  });
}

async function listUsers() {
  return User.findAll({
    attributes: ['id', 'email', 'fullName', 'phone', 'role', 'points', 'createdAt'],
    order: [['createdAt', 'DESC']],
    limit: 500,
  });
}

async function updateUserRole({ userId, role }) {
  const u = await User.findByPk(userId);
  if (!u) {
    const err = new Error('No encontrado');
    err.status = 404;
    throw err;
  }
  u.role = role;
  await u.save();
  return u;
}

async function deleteUser({ userId, actorUserId }) {
  if (!userId) {
    const err = new Error('ID requerido');
    err.status = 400;
    throw err;
  }
  if (userId === actorUserId) {
    const err = new Error('No puedes eliminar tu propia cuenta');
    err.status = 400;
    throw err;
  }

  const u = await User.findByPk(userId);
  if (!u) {
    const err = new Error('No encontrado');
    err.status = 404;
    throw err;
  }

  if (u.role === 'admin') {
    const adminsCount = await User.count({ where: { role: 'admin' } });
    if (adminsCount <= 1) {
      const err = new Error('No puedes eliminar el último admin de la plataforma');
      err.status = 400;
      throw err;
    }
  }

  try {
    await u.destroy();
    return { ok: true };
  } catch (e) {
    const err = new Error(
      'No se puede eliminar esta cuenta porque tiene datos asociados (reservas, tickets, pagos u otros registros).'
    );
    err.status = 409;
    throw err;
  }
}

async function listTransactions() {
  return Payment.findAll({
    where: { status: 'completed' },
    include: [
      { model: Order, as: 'order', required: false },
      { model: Reservation, as: 'reservation', required: false },
    ],
    order: [['createdAt', 'DESC']],
    limit: 200,
  });
}

async function revenueByVenue({ from, to } = {}) {
  const ticketFilters = [];
  const reservationFilters = [];
  const replacements = {};

  if (from) {
    ticketFilters.push('t.created_at >= :from');
    reservationFilters.push('r.created_at >= :from');
    replacements.from = from;
  }
  if (to) {
    ticketFilters.push('t.created_at <= :to');
    reservationFilters.push('r.created_at <= :to');
    replacements.to = to;
  }

  const ticketWhere = ticketFilters.length ? `AND ${ticketFilters.join(' AND ')}` : '';
  const reservationWhere = reservationFilters.length ? `AND ${reservationFilters.join(' AND ')}` : '';

  const rows = await sequelize.query(
    `
      SELECT
        "venueId",
        "venueName",
        "venueCity",
        "reservationsGross",
        "reservationsCommission",
        "ticketsGross",
        "ticketsCommission",
        "totalControlledGross",
        "totalControlledCommission"
      FROM (${adminRevenueSourcesQuery({ ticketWhere, reservationWhere })}) src
      WHERE "totalControlledGross" > 0
      ORDER BY "totalControlledGross" DESC
    `,
    { replacements, type: QueryTypes.SELECT }
  );

  const normalized = rows.map((row) => ({
    venueId: row.venueId,
    venueName: row.venueName || 'Sin local',
    venueCity: row.venueCity || null,
    reservationsGross: Number(row.reservationsGross || 0),
    reservationsCommission: Number(row.reservationsCommission || 0),
    ticketsGross: Number(row.ticketsGross || 0),
    ticketsCommission: Number(row.ticketsCommission || 0),
    totalControlledGross: Number(row.totalControlledGross || 0),
    totalControlledCommission: Number(row.totalControlledCommission || 0),
  }));

  const totals = normalized.reduce(
    (acc, row) => ({
      reservationsGross: acc.reservationsGross + row.reservationsGross,
      reservationsCommission: acc.reservationsCommission + row.reservationsCommission,
      ticketsGross: acc.ticketsGross + row.ticketsGross,
      ticketsCommission: acc.ticketsCommission + row.ticketsCommission,
      totalControlledGross: acc.totalControlledGross + row.totalControlledGross,
      totalControlledCommission: acc.totalControlledCommission + row.totalControlledCommission,
    }),
    {
      reservationsGross: 0,
      reservationsCommission: 0,
      ticketsGross: 0,
      ticketsCommission: 0,
      totalControlledGross: 0,
      totalControlledCommission: 0,
    }
  );

  return { rows: normalized, totals };
}

async function venueDetail({ venueId, from, to }) {
  const venue = await Venue.findByPk(venueId, {
    include: [{ model: User, as: 'owner', attributes: ['id', 'email', 'fullName', 'phone', 'createdAt'] }],
  });
  if (!venue) {
    const err = new Error('Local no encontrado');
    err.status = 404;
    throw err;
  }

  const ticketFilters = ['v.id = :venueId'];
  const reservationFilters = ['v.id = :venueId'];
  const replacements = { venueId };
  if (from) {
    ticketFilters.push('t.created_at >= :from');
    reservationFilters.push('r.created_at >= :from');
    replacements.from = from;
  }
  if (to) {
    ticketFilters.push('t.created_at <= :to');
    reservationFilters.push('r.created_at <= :to');
    replacements.to = to;
  }

  const revenueRows = await sequelize.query(
    `
    SELECT *
    FROM (${adminRevenueSourcesQuery({
      ticketWhere: `AND ${ticketFilters.join(' AND ')}`,
      reservationWhere: `AND ${reservationFilters.join(' AND ')}`,
    })}) src
    LIMIT 1
  `,
    { replacements, type: QueryTypes.SELECT }
  );
  const revenue = revenueRows[0] || {};

  const [events, countsRows, moneyRows, issueRows, lastRows] = await Promise.all([
    Event.findAll({
      where: {
        venueId,
        status: { [Op.ne]: 'cancelled' },
      },
      attributes: ['id', 'title', 'status', 'startAt', 'publicado'],
      order: [['startAt', 'DESC']],
      limit: 8,
      raw: true,
    }),
    sequelize.query(
      `
      SELECT
        (SELECT COUNT(*) FROM events WHERE venue_id = :venueId AND status <> 'cancelled')::int AS "eventsTotal",
        (SELECT COUNT(*) FROM events WHERE venue_id = :venueId AND status = 'published')::int AS "eventsPublished",
        (SELECT COUNT(*) FROM events WHERE venue_id = :venueId AND start_at >= NOW() AND status <> 'cancelled')::int AS "upcomingEvents",
        (SELECT COUNT(*) FROM reservations r JOIN events e ON e.id = r.event_id WHERE e.venue_id = :venueId AND r.status NOT IN ('cancelled', 'no_show'))::int AS "reservationsActive",
        (SELECT COUNT(*) FROM tickets t JOIN events e ON e.id = t.event_id WHERE e.venue_id = :venueId AND t.status <> 'cancelled')::int AS "ticketsActive"
    `,
      { replacements: { venueId }, type: QueryTypes.SELECT }
    ),
    sequelize.query(
      `
      SELECT
        COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount::decimal ELSE 0 END), 0)::decimal AS "paymentsCompleted",
        COALESCE(SUM(CASE WHEN p.status = 'pending' THEN p.amount::decimal ELSE 0 END), 0)::decimal AS "paymentsPending",
        COALESCE(SUM(CASE WHEN p.status = 'failed' THEN p.amount::decimal ELSE 0 END), 0)::decimal AS "paymentsFailed"
      FROM payments p
      LEFT JOIN orders o ON o.id = p.order_id
      LEFT JOIN reservations r ON r.id = p.reservation_id
      LEFT JOIN events e_res ON e_res.id = r.event_id
      WHERE COALESCE(o.venue_id, e_res.venue_id) = :venueId
    `,
      { replacements: { venueId }, type: QueryTypes.SELECT }
    ),
    sequelize.query(
      `
      SELECT
        (SELECT COUNT(*) FROM payments p LEFT JOIN orders o ON o.id = p.order_id LEFT JOIN reservations r ON r.id = p.reservation_id LEFT JOIN events e_res ON e_res.id = r.event_id WHERE COALESCE(o.venue_id, e_res.venue_id) = :venueId AND p.status = 'pending')::int AS "pendingPayments",
        (SELECT COUNT(*) FROM payments p LEFT JOIN orders o ON o.id = p.order_id LEFT JOIN reservations r ON r.id = p.reservation_id LEFT JOIN events e_res ON e_res.id = r.event_id WHERE COALESCE(o.venue_id, e_res.venue_id) = :venueId AND p.status = 'failed')::int AS "failedPayments",
        (SELECT COUNT(*) FROM orders WHERE venue_id = :venueId AND ticket_email_send_error IS NOT NULL AND ticket_email_send_error <> '')::int AS "ticketEmailErrors",
        (
          SELECT COUNT(*)
          FROM reservations r
          JOIN events e ON e.id = r.event_id
          WHERE e.venue_id = :venueId
            AND r.status = 'pending'
            AND EXISTS (SELECT 1 FROM payments p WHERE p.reservation_id = r.id AND p.status = 'completed')
        )::int AS "paidReservationsStillPending",
        (
          SELECT COUNT(*)
          FROM events e
          WHERE e.venue_id = :venueId
            AND e.status = 'published'
            AND NOT EXISTS (SELECT 1 FROM event_ticket_types ett WHERE ett.event_id = e.id)
            AND NOT EXISTS (SELECT 1 FROM venue_tables vt WHERE vt.event_id = e.id)
        )::int AS "publishedEventsWithoutSalesConfig"
    `,
      { replacements: { venueId }, type: QueryTypes.SELECT }
    ),
    sequelize.query(
      `
      SELECT MAX(ts) AS "lastActivityAt"
      FROM (
        SELECT created_at AS ts FROM orders WHERE venue_id = :venueId
        UNION ALL
        SELECT t.created_at AS ts FROM tickets t JOIN events e ON e.id = t.event_id WHERE e.venue_id = :venueId
        UNION ALL
        SELECT r.created_at AS ts FROM reservations r JOIN events e ON e.id = r.event_id WHERE e.venue_id = :venueId
      ) activity
    `,
      { replacements: { venueId }, type: QueryTypes.SELECT }
    ),
  ]);

  const reservationsGross = Number(revenue.reservationsGross || 0);
  const ticketsGross = Number(revenue.ticketsGross || 0);
  const localRevenue = Number(revenue.totalControlledGross || 0);
  const appCommission = Number(revenue.totalControlledCommission || 0);
  const money = moneyRows[0] || {};
  const issues = issueRows[0] || {};
  const issueTotal =
    Number(issues.pendingPayments || 0) +
    Number(issues.failedPayments || 0) +
    Number(issues.ticketEmailErrors || 0) +
    Number(issues.paidReservationsStillPending || 0) +
    Number(issues.publishedEventsWithoutSalesConfig || 0);

  return {
    venue: {
      id: venue.id,
      name: venue.name,
      city: venue.city,
      address: venue.address,
      status: venue.status,
      createdAt: venue.createdAt,
      owner: venue.owner
        ? {
            id: venue.owner.id,
            fullName: venue.owner.fullName,
            email: venue.owner.email,
            phone: venue.owner.phone,
            createdAt: venue.owner.createdAt,
          }
        : null,
    },
    period: { from: from || null, to: to || null },
    revenue: {
      reservationsGross,
      reservationsCommission: Number(revenue.reservationsCommission || 0),
      ticketsGross,
      ticketsCommission: Number(revenue.ticketsCommission || 0),
      localRevenue,
      appCommission,
      customerCollected: Number((localRevenue + appCommission).toFixed(2)),
    },
    reconciliation: {
      customerCollected: Number((localRevenue + appCommission).toFixed(2)),
      localRevenue,
      appCommission,
      pendingToCollect: Number(money.paymentsPending || 0),
      failedAmount: Number(money.paymentsFailed || 0),
      completedPayments: Number(money.paymentsCompleted || 0),
      pendingPayments: Number(issues.pendingPayments || 0),
      failedPayments: Number(issues.failedPayments || 0),
    },
    counts: countsRows[0] || {},
    issues: {
      total: issueTotal,
      pendingPayments: Number(issues.pendingPayments || 0),
      failedPayments: Number(issues.failedPayments || 0),
      ticketEmailErrors: Number(issues.ticketEmailErrors || 0),
      paidReservationsStillPending: Number(issues.paidReservationsStillPending || 0),
      publishedEventsWithoutSalesConfig: Number(issues.publishedEventsWithoutSalesConfig || 0),
    },
    events: events.map((event) => ({
      id: event.id,
      title: event.title,
      status: event.status,
      startAt: event.startAt,
      publicado: event.publicado,
    })),
    lastActivityAt: lastRows[0]?.lastActivityAt || null,
  };
}

const EVENT_STATUSES = new Set(['draft', 'published', 'paused', 'cancelled']);

async function listGlobalEvents({ from, to, status, q, limit }) {
  const cap = Math.min(Math.max(Number(limit) || 120, 1), 200);
  const where = {};

  const st = status && String(status);
  if (st && st !== 'all' && EVENT_STATUSES.has(st) && st !== 'cancelled') {
    where.status = st;
  } else {
    where.status = { [Op.ne]: 'cancelled' };
  }

  if (from || to) {
    where.startAt = {};
    if (from) where.startAt[Op.gte] = new Date(from);
    if (to) where.startAt[Op.lte] = new Date(to);
  }

  const qTerm = q && String(q).trim();
  if (qTerm) {
    const like = `%${qTerm}%`;
    where[Op.or] = [
      { title: { [Op.iLike]: like } },
      { slug: { [Op.iLike]: like } },
      { '$venue.name$': { [Op.iLike]: like } },
    ];
  }

  const rows = await Event.findAll({
    where,
    attributes: [
      'id',
      'venueId',
      'title',
      'slug',
      'status',
      'startAt',
      'endAt',
      'publicado',
      'city',
      'category',
    ],
    include: [
      {
        model: Venue,
        as: 'venue',
        attributes: ['id', 'name', 'city', 'status'],
        required: true,
      },
    ],
    order: [['startAt', 'DESC']],
    limit: cap,
    subQuery: false,
  });

  const ids = rows.map((r) => r.id);
  const salesByEventId = {};
  const num = (x) => {
    const v = Number(x);
    return Number.isFinite(v) ? v : 0;
  };

  if (ids.length) {
    for (const id of ids) {
      salesByEventId[id] = {
        ticketsCount: 0,
        ticketsGross: 0,
        reservationsCount: 0,
        reservationsGross: 0,
        ticketsByType: [],
      };
    }

    const [ticketTotals, ticketByType, resTotals] = await Promise.all([
      sequelize.query(
        `
        SELECT t.event_id AS "eventId",
               COUNT(*)::int AS "ticketsCount",
               COALESCE(SUM(t.unit_price::decimal), 0)::decimal AS "ticketsGross"
        FROM tickets t
        WHERE t.event_id IN (:ids) AND t.status <> 'cancelled'
        GROUP BY t.event_id
      `,
        { replacements: { ids }, type: QueryTypes.SELECT }
      ),
      sequelize.query(
        `
        SELECT t.event_id AS "eventId",
               t.ticket_type AS "ticketType",
               COUNT(*)::int AS "count",
               COALESCE(SUM(t.unit_price::decimal), 0)::decimal AS "gross"
        FROM tickets t
        WHERE t.event_id IN (:ids) AND t.status <> 'cancelled'
        GROUP BY t.event_id, t.ticket_type
      `,
        { replacements: { ids }, type: QueryTypes.SELECT }
      ),
      sequelize.query(
        `
        SELECT r.event_id AS "eventId",
               COUNT(*)::int AS "reservationsCount",
               COALESCE(SUM(r.total_amount::decimal), 0)::decimal AS "reservationsGross"
        FROM reservations r
        WHERE r.event_id IN (:ids) AND r.status NOT IN ('cancelled', 'no_show')
        GROUP BY r.event_id
      `,
        { replacements: { ids }, type: QueryTypes.SELECT }
      ),
    ]);

    for (const r of ticketTotals) {
      const s = salesByEventId[r.eventId];
      if (s) {
        s.ticketsCount = num(r.ticketsCount);
        s.ticketsGross = num(r.ticketsGross);
      }
    }
    for (const r of resTotals) {
      const s = salesByEventId[r.eventId];
      if (s) {
        s.reservationsCount = num(r.reservationsCount);
        s.reservationsGross = num(r.reservationsGross);
      }
    }
    for (const r of ticketByType) {
      const s = salesByEventId[r.eventId];
      if (s) {
        s.ticketsByType.push({
          ticketType: String(r.ticketType || '—'),
          count: num(r.count),
          gross: num(r.gross),
        });
      }
    }
    for (const id of ids) {
      const s = salesByEventId[id];
      s.ticketsByType.sort((a, b) => b.gross - a.gross);
      s.totalGross = Number((s.ticketsGross + s.reservationsGross).toFixed(2));
    }
  }

  return {
    events: rows.map((e) => {
      const j = typeof e.toJSON === 'function' ? e.toJSON() : e;
      const v = j.venue;
      const sales = salesByEventId[j.id] || {
        ticketsCount: 0,
        ticketsGross: 0,
        reservationsCount: 0,
        reservationsGross: 0,
        totalGross: 0,
        ticketsByType: [],
      };
      return {
        id: j.id,
        venueId: j.venueId,
        title: j.title,
        slug: j.slug,
        status: j.status,
        startAt: j.startAt,
        endAt: j.endAt,
        publicado: j.publicado,
        city: j.city,
        category: j.category,
        venue: v
          ? {
              id: v.id,
              name: v.name,
              city: v.city,
              status: v.status,
            }
          : null,
        sales,
      };
    }),
  };
}

async function eventSalesDetail({ eventId }) {
  const event = await Event.findByPk(eventId, {
    attributes: ['id', 'title', 'slug', 'startAt', 'venueId', 'status'],
    include: [{ model: Venue, as: 'venue', attributes: ['id', 'name', 'city'] }],
  });
  if (!event) {
    const err = new Error('Evento no encontrado');
    err.status = 404;
    throw err;
  }

  const [ticketRows, reservationRows] = await Promise.all([
    Ticket.findAll({
      where: {
        eventId,
        status: { [Op.ne]: 'cancelled' },
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'fullName', 'phone'],
          required: true,
        },
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'type', 'status', 'createdAt', 'subtotal', 'tax', 'total'],
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: 800,
    }),
    Reservation.findAll({
      where: {
        eventId,
        status: { [Op.notIn]: ['cancelled', 'no_show'] },
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'fullName', 'phone'],
          required: true,
        },
        {
          model: VenueTable,
          as: 'table',
          attributes: ['id', 'zone', 'label'],
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: 400,
    }),
  ]);

  const ej = typeof event.toJSON === 'function' ? event.toJSON() : event;
  const v = ej.venue;

  const orderIds = [...new Set(ticketRows.map((row) => row.orderId).filter(Boolean))];
  const reservationIds = reservationRows.map((row) => row.id);

  const [sumTicketByOrder, orderPaySums, resPaySums] = await Promise.all([
    orderIds.length
      ? sequelize.query(
          `
        SELECT order_id AS "orderId", COALESCE(SUM(unit_price::decimal), 0)::decimal AS "sumUnit"
        FROM tickets
        WHERE order_id IN (:orderIds) AND status <> 'cancelled'
        GROUP BY order_id
      `,
          { replacements: { orderIds }, type: QueryTypes.SELECT }
        )
      : Promise.resolve([]),
    orderIds.length
      ? sequelize.query(
          `
        SELECT order_id AS "orderId", COALESCE(SUM(amount::decimal), 0)::decimal AS "paid"
        FROM payments
        WHERE order_id IN (:orderIds) AND status = 'completed'
        GROUP BY order_id
      `,
          { replacements: { orderIds }, type: QueryTypes.SELECT }
        )
      : Promise.resolve([]),
    reservationIds.length
      ? sequelize.query(
          `
        SELECT reservation_id AS "reservationId", COALESCE(SUM(amount::decimal), 0)::decimal AS "paid"
        FROM payments
        WHERE reservation_id IN (:ids) AND status = 'completed'
        GROUP BY reservation_id
      `,
          { replacements: { ids: reservationIds }, type: QueryTypes.SELECT }
        )
      : Promise.resolve([]),
  ]);

  const ticketSumByOrder = Object.fromEntries(
    (sumTicketByOrder || []).map((row) => [row.orderId, asMoneyNum(row.sumUnit)])
  );
  const paidByOrder = Object.fromEntries((orderPaySums || []).map((row) => [row.orderId, asMoneyNum(row.paid)]));
  const paidByReservation = Object.fromEntries(
    (resPaySums || []).map((row) => [row.reservationId, asMoneyNum(row.paid)])
  );

  const tickets = ticketRows.map((t) => {
      const x = typeof t.toJSON === 'function' ? t.toJSON() : t;
      const u = x.user;
      const o = x.order;
      const catalogLineRD = asMoneyNum(x.unitPrice);
      let customerPaidRD = catalogLineRD;
      let orderFeeAllocatedRD = 0;
      let orderSubtotalRD = null;
      let orderTotalRD = null;
      let orderTaxRD = null;
      if (o && x.orderId) {
        orderSubtotalRD = asMoneyNum(o.subtotal);
        orderTotalRD = asMoneyNum(o.total);
        orderTaxRD = asMoneyNum(o.tax);
        const denom = ticketSumByOrder[x.orderId] > 0 ? ticketSumByOrder[x.orderId] : orderSubtotalRD;
        const paidOrder =
          paidByOrder[x.orderId] > 0 ? paidByOrder[x.orderId] : o.status === 'paid' ? orderTotalRD : 0;
        if (denom > 0 && paidOrder > 0) {
          customerPaidRD = Number(((paidOrder * catalogLineRD) / denom).toFixed(2));
        }
        if (denom > 0 && orderTaxRD > 0) {
          orderFeeAllocatedRD = Number(((orderTaxRD * catalogLineRD) / denom).toFixed(2));
        }
      }
      return {
        id: x.id,
        ticketType: x.ticketType,
        unitPrice: catalogLineRD,
        catalogLineRD,
        customerPaidRD,
        orderFeeAllocatedRD,
        orderSubtotalRD,
        orderTotalRD,
        orderTaxRD,
        status: x.status,
        createdAt: x.createdAt,
        orderId: x.orderId,
        orderType: o?.type ?? null,
        orderStatus: o?.status ?? null,
        orderCreatedAt: o?.createdAt ?? null,
        buyer: u
          ? {
              id: u.id,
              email: u.email,
              fullName: u.fullName,
              phone: u.phone,
            }
          : null,
      };
    });
  const reservations = reservationRows.map((r) => {
      const x = typeof r.toJSON === 'function' ? r.toJSON() : r;
      const u = x.user;
      const tbl = x.table;
      const tableLabel = tbl ? [tbl.zone, tbl.label].filter(Boolean).join(' · ') : null;
      const split = reservationPaymentSplit({ totalAmount: x.totalAmount, notes: x.notes });
      const paySum = paidByReservation[x.id] || 0;
      const contract = split.totalContratoRD != null ? split.totalContratoRD : null;
      const pending = split.saldoPendienteRD != null ? split.saldoPendienteRD : null;
      const customerPaid =
        paySum > 0
          ? paySum
          : split.payNowCustomerRD != null && Number.isFinite(split.payNowCustomerRD)
            ? split.payNowCustomerRD
            : asMoneyNum(x.totalAmount);
      return {
        id: x.id,
        status: x.status,
        partySize: x.partySize,
        totalAmount: asMoneyNum(x.totalAmount),
        customerPaidOnlineRD: Number(Number(customerPaid).toFixed(2)),
        contractLocalTotalRD: contract != null ? Number(Number(contract).toFixed(2)) : null,
        pendingAtVenueRD: pending != null ? Number(Number(pending).toFixed(2)) : null,
        createdAt: x.createdAt,
        tableLabel,
        buyer: u
          ? {
              id: u.id,
              email: u.email,
              fullName: u.fullName,
              phone: u.phone,
            }
          : null,
      };
    });

  const sums = {
    ticketsCatalogTotalRD: Number(tickets.reduce((acc, row) => acc + row.catalogLineRD, 0).toFixed(2)),
    ticketsCustomerPaidTotalRD: Number(tickets.reduce((acc, row) => acc + row.customerPaidRD, 0).toFixed(2)),
    reservationsCustomerPaidTotalRD: Number(
      reservations.reduce((acc, row) => acc + row.customerPaidOnlineRD, 0).toFixed(2)
    ),
    reservationsContractTotalRD: Number(
      reservations.reduce((acc, row) => acc + (row.contractLocalTotalRD ?? 0), 0).toFixed(2)
    ),
    reservationsPendingVenueTotalRD: Number(
      reservations.reduce((acc, row) => acc + (row.pendingAtVenueRD ?? 0), 0).toFixed(2)
    ),
    customerPaidGrandTotalRD: Number(
      (
        tickets.reduce((acc, row) => acc + row.customerPaidRD, 0) +
        reservations.reduce((acc, row) => acc + row.customerPaidOnlineRD, 0)
      ).toFixed(2)
    ),
  };

  return {
    event: {
      id: ej.id,
      title: ej.title,
      slug: ej.slug,
      startAt: ej.startAt,
      status: ej.status,
      venueId: ej.venueId,
      venue: v ? { id: v.id, name: v.name, city: v.city } : null,
    },
    tickets,
    reservations,
    sums,
  };
}

module.exports = {
  dashboardSummary,
  listPendingVenues,
  listUsers,
  updateUserRole,
  deleteUser,
  listTransactions,
  revenueByVenue,
  venueDetail,
  listGlobalEvents,
  eventSalesDetail,
};
