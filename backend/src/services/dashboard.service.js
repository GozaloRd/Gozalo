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
  AccessLog,
} = require('../models');
const {
  rangesNow,
  rangesSalesPanelMobile,
  pctChange,
  startOfDay,
  endOfDay,
  addDays,
} = require('../controllers/dashboardHelpers');

const SOLD_TICKET_STATUSES = ['paid', 'valid', 'used'];
const ACTIVE_RESERVATION_STATUSES = ['pending', 'confirmed', 'checked_in', 'completed'];

/** Ingreso atribuible al local por pago completado (monto cobrado, sin deducciones de plataforma). */
function sqlPaymentVenueNet(alias = 'p') {
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
      WHEN ${alias}.reservation_id IS NOT NULL THEN
        COALESCE((
          SELECT COALESCE(
            NULLIF(rr.notes::jsonb #>> '{payment,payNowLocalBase}', '')::decimal,
            CASE
              WHEN NULLIF(rr.notes::jsonb #>> '{payment,table,amount}', '') IS NOT NULL THEN
                ROUND((
                  COALESCE(NULLIF(rr.notes::jsonb #>> '{payment,table,amount}', '')::decimal, 0)
                  + COALESCE(NULLIF(rr.notes::jsonb #>> '{payment,cover,amount}', '')::decimal, 0)
                ) * COALESCE(NULLIF(rr.notes::jsonb #>> '{payment,upfrontPercent}', '')::decimal, 100) / 100, 2)
              ELSE NULL
            END,
            NULLIF(rr.notes::jsonb #>> '{payment,payNow}', '')::decimal,
            rr.total_amount::decimal
          )
          FROM reservations rr
          WHERE rr.id = ${alias}.reservation_id
        ), ${alias}.amount::decimal)
      ELSE ${alias}.amount::decimal
    END
  )`;
}

function sqlOrderVenueNet(alias = 'o') {
  return `(
    CASE
      WHEN EXISTS (
        SELECT 1 FROM tickets t WHERE t.order_id = ${alias}.id AND t.status <> 'cancelled'
      ) THEN
        COALESCE((
          SELECT SUM(t.unit_price::decimal)
          FROM tickets t
          WHERE t.order_id = ${alias}.id AND t.status <> 'cancelled'
        ), ${alias}.total::decimal)
      ELSE ${alias}.total::decimal
    END
  )`;
}

/** Reserva sin pago completado en `payments`: tramo en `payNowLocalBase` o total almacenado. */
function sqlReservationVenueNet(alias = 'r') {
  return `(
    CASE
      WHEN COALESCE(NULLIF(${alias}.notes::jsonb #>> '{payment,paymentVersion}', ''), '0')::int >= 2
           OR NULLIF(${alias}.notes::jsonb #>> '{payment,payNowLocalBase}', '') IS NOT NULL THEN
        COALESCE(
          NULLIF(${alias}.notes::jsonb #>> '{payment,payNowLocalBase}', '')::decimal,
          ${alias}.total_amount::decimal
        )
      WHEN NULLIF(${alias}.notes::jsonb #>> '{payment,table,amount}', '') IS NOT NULL THEN
        ROUND((
          COALESCE(NULLIF(${alias}.notes::jsonb #>> '{payment,table,amount}', '')::decimal, 0)
          + COALESCE(NULLIF(${alias}.notes::jsonb #>> '{payment,cover,amount}', '')::decimal, 0)
        ) * COALESCE(NULLIF(${alias}.notes::jsonb #>> '{payment,upfrontPercent}', '')::decimal, 100) / 100, 2)
      ELSE ${alias}.total_amount::decimal
    END
  )`;
}

function ticketVenueReplacements(extra = {}) {
  return { ...extra };
}

async function sumPaymentRevenue(venueId, start, end, eventId = null) {
  const net = sqlPaymentVenueNet('p');
  const eventClause = eventId
    ? `AND (
      (o.id IS NOT NULL AND o.event_id = :eventId)
      OR (r.id IS NOT NULL AND r.event_id = :eventId)
    )`
    : '';
  const rows = await sequelize.query(
    `
    SELECT COALESCE(SUM(${net}), 0)::decimal AS total
    FROM payments p
    LEFT JOIN orders o ON p.order_id = o.id
    LEFT JOIN reservations r ON p.reservation_id = r.id
    LEFT JOIN events e ON r.event_id = e.id
    WHERE p.status = 'completed'
    AND p.created_at BETWEEN :start AND :end
    AND (o.venue_id = :venueId OR e.venue_id = :venueId)
    ${eventClause}
    AND (
      o.id IS NULL
      OR o.event_id IS NULL
      OR EXISTS (
        SELECT 1 FROM events eo
        WHERE eo.id = o.event_id
        AND eo.venue_id = :venueId
        AND eo.status <> 'cancelled'
      )
    )
    AND (
      r.id IS NULL
      OR (e.id IS NOT NULL AND e.status <> 'cancelled')
    )
  `,
    { replacements: ticketVenueReplacements({ venueId, start, end, ...(eventId ? { eventId } : {}) }), type: QueryTypes.SELECT }
  );
  return Number(rows[0]?.total || 0);
}

async function sumCashClosingGrandTotal(venueId, start, end, eventId) {
  const where = { venueId, createdAt: { [Op.between]: [start, end] } };
  if (eventId) where.eventId = eventId;
  const sum = await CashClosing.sum('grandTotal', { where });
  return Number(sum || 0);
}

/**
 * Ventas en web de entradas: la orden queda `paid` sin fila `payments` (ver tickets.service).
 * Sin esto, `sumPaymentRevenue` da 0 aunque haya ingresos reales en `tickets` / `revenueByEvent`.
 */
async function sumPaidOrdersWithoutCompletedPayment(venueId, start, end, eventId = null) {
  const ordNet = sqlOrderVenueNet('o');
  const eventClause = eventId ? 'AND o.event_id = :eventId' : '';
  const rows = await sequelize.query(
    `
    SELECT COALESCE(SUM(${ordNet}), 0)::decimal AS total
    FROM orders o
    WHERE o.venue_id = :venueId
    AND o.status = 'paid'
    AND o.created_at BETWEEN :start AND :end
    ${eventClause}
    AND (
      o.event_id IS NULL
      OR EXISTS (
        SELECT 1 FROM events ev
        WHERE ev.id = o.event_id
        AND ev.venue_id = :venueId
        AND ev.status <> 'cancelled'
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM payments p
      WHERE p.order_id = o.id AND p.status = 'completed'
    )
  `,
    { replacements: ticketVenueReplacements({ venueId, start, end, ...(eventId ? { eventId } : {}) }), type: QueryTypes.SELECT }
  );
  return Number(rows[0]?.total || 0);
}

/**
 * Reservas/mesas: `totalAmount` contabilizado sin fila `payments` completada
 * (cobro en barra, depósito manual, u orígenes que no generan payment como entradas web).
 */
async function sumReservationRevenueWithoutCompletedPayment(venueId, start, end, eventId = null) {
  const resNet = sqlReservationVenueNet('r');
  const eventClause = eventId ? 'AND r.event_id = :eventId' : '';
  const rows = await sequelize.query(
    `
    SELECT COALESCE(SUM(${resNet}), 0)::decimal AS total
    FROM reservations r
    INNER JOIN events e ON r.event_id = e.id
    WHERE e.venue_id = :venueId
    AND e.status <> 'cancelled'
    AND r.status IN ('pending', 'confirmed', 'checked_in', 'completed')
    AND r.created_at BETWEEN :start AND :end
    ${eventClause}
    AND NOT EXISTS (
      SELECT 1 FROM payments p
      WHERE p.reservation_id = r.id AND p.status = 'completed'
    )
  `,
    { replacements: ticketVenueReplacements({ venueId, start, end, ...(eventId ? { eventId } : {}) }), type: QueryTypes.SELECT }
  );
  return Number(rows[0]?.total || 0);
}

async function venuePeriodRevenueTotal(venueId, start, end, eventId = null) {
  const [digital, manual, orphanPaidOrders, orphanReservations] = await Promise.all([
    sumPaymentRevenue(venueId, start, end, eventId),
    sumCashClosingGrandTotal(venueId, start, end, eventId),
    sumPaidOrdersWithoutCompletedPayment(venueId, start, end, eventId),
    sumReservationRevenueWithoutCompletedPayment(venueId, start, end, eventId),
  ]);
  return Number(
    (
      Number(digital || 0) +
      Number(manual || 0) +
      Number(orphanPaidOrders || 0) +
      Number(orphanReservations || 0)
    ).toFixed(2)
  );
}

async function sumPaidOrderTotalsInRange(venueId, start, end) {
  const ordNet = sqlOrderVenueNet('o');
  const rows = await sequelize.query(
    `
    SELECT COALESCE(SUM(${ordNet}), 0)::decimal AS total
    FROM orders o
    WHERE o.venue_id = :venueId
    AND o.status = 'paid'
    AND o.created_at BETWEEN :start AND :end
  `,
    { replacements: ticketVenueReplacements({ venueId, start, end }), type: QueryTypes.SELECT }
  );
  return Number(rows[0]?.total || 0);
}

async function countPaidOrdersInRange(venueId, start, end) {
  return Order.count({
    where: {
      venueId,
      status: 'paid',
      createdAt: { [Op.between]: [start, end] },
    },
  });
}

/**
 * Ingresos atribuibles a evento (misma lógica que `venuePeriodRevenueTotal` pero por event_id).
 * `grandTotal` debe ser el total del local en [start,end]; la diferencia va a "Otros ingresos".
 */
async function venueAttributedRevenueByEventRows(venueId, start, end, grandTotal, eventId = null) {
  const payNet = sqlPaymentVenueNet('p');
  const paymentEventClause = eventId
    ? `AND (
        (o.id IS NOT NULL AND o.event_id = :eventId)
        OR (r.id IS NOT NULL AND r.event_id = :eventId)
      )`
    : '';
  const orderEventClause = eventId ? 'AND o.event_id = :eventId' : '';
  const cashEventClause = eventId ? 'AND cc.event_id = :eventId' : '';
  const reservationEventClause = eventId ? 'AND r.event_id = :eventId' : '';
  const [paymentRows, orphanRows, cashRows, orphanResRows] = await Promise.all([
    sequelize.query(
      `
      SELECT
        (CASE
          WHEN o.id IS NOT NULL AND o.event_id IS NOT NULL THEN o.event_id::text
          WHEN r.id IS NOT NULL AND r.event_id IS NOT NULL THEN r.event_id::text
          ELSE NULL
        END) AS event_id,
        COALESCE(SUM(${payNet}), 0)::decimal AS total
      FROM payments p
      LEFT JOIN orders o ON p.order_id = o.id
      LEFT JOIN reservations r ON p.reservation_id = r.id
      WHERE p.status = 'completed'
      AND p.created_at BETWEEN :start AND :end
      ${paymentEventClause}
      AND (
        (
          o.id IS NOT NULL
          AND o.venue_id = :venueId
          AND (
            o.event_id IS NULL
            OR EXISTS (
              SELECT 1 FROM events eo
              WHERE eo.id = o.event_id
              AND eo.venue_id = :venueId
              AND eo.status <> 'cancelled'
            )
          )
        )
        OR (r.id IS NOT NULL AND EXISTS (
          SELECT 1 FROM events ev WHERE ev.id = r.event_id AND ev.venue_id = :venueId AND ev.status <> 'cancelled'
        ))
      )
      GROUP BY 1
    `,
      { replacements: ticketVenueReplacements({ venueId, start, end, ...(eventId ? { eventId } : {}) }), type: QueryTypes.SELECT }
    ),
    sequelize.query(
      `
      SELECT o.event_id::text AS event_id, COALESCE(SUM(${sqlOrderVenueNet('o')}), 0)::decimal AS total
      FROM orders o
      WHERE o.venue_id = :venueId
      AND o.status = 'paid'
      AND o.created_at BETWEEN :start AND :end
      AND o.event_id IS NOT NULL
      ${orderEventClause}
      AND EXISTS (
        SELECT 1 FROM events ev
        WHERE ev.id = o.event_id
        AND ev.venue_id = :venueId
        AND ev.status <> 'cancelled'
      )
      AND NOT EXISTS (
        SELECT 1 FROM payments p WHERE p.order_id = o.id AND p.status = 'completed'
      )
      GROUP BY o.event_id
    `,
      { replacements: ticketVenueReplacements({ venueId, start, end, ...(eventId ? { eventId } : {}) }), type: QueryTypes.SELECT }
    ),
    sequelize.query(
      `
      SELECT cc.event_id::text AS event_id, COALESCE(SUM(cc.grand_total), 0)::decimal AS total
      FROM cash_closings cc
      WHERE cc.venue_id = :venueId
      AND cc.created_at BETWEEN :start AND :end
      AND cc.event_id IS NOT NULL
      ${cashEventClause}
      AND EXISTS (
        SELECT 1 FROM events ev
        WHERE ev.id = cc.event_id
        AND ev.venue_id = :venueId
        AND ev.status <> 'cancelled'
      )
      GROUP BY cc.event_id
    `,
      { replacements: { venueId, start, end, ...(eventId ? { eventId } : {}) }, type: QueryTypes.SELECT }
    ),
    sequelize.query(
      `
      SELECT r.event_id::text AS event_id, COALESCE(SUM(${sqlReservationVenueNet('r')}), 0)::decimal AS total
      FROM reservations r
      INNER JOIN events e ON r.event_id = e.id
      WHERE e.venue_id = :venueId
      AND e.status <> 'cancelled'
      AND r.status IN ('pending', 'confirmed', 'checked_in', 'completed')
      AND r.created_at BETWEEN :start AND :end
      AND r.event_id IS NOT NULL
      ${reservationEventClause}
      AND NOT EXISTS (
        SELECT 1 FROM payments p WHERE p.reservation_id = r.id AND p.status = 'completed'
      )
      GROUP BY r.event_id
    `,
      { replacements: ticketVenueReplacements({ venueId, start, end, ...(eventId ? { eventId } : {}) }), type: QueryTypes.SELECT }
    ),
  ]);

  const map = new Map();
  function add(id, amt) {
    if (id == null || id === 'null' || id === '') return;
    const k = String(id);
    const n = Number(amt || 0);
    map.set(k, (map.get(k) || 0) + n);
  }

  for (const row of paymentRows) {
    add(row.event_id, row.total);
  }
  for (const row of orphanRows) {
    add(row.event_id, row.total);
  }
  for (const row of cashRows) {
    add(row.event_id, row.total);
  }
  for (const row of orphanResRows) {
    add(row.event_id, row.total);
  }

  let sumAttributed = 0;
  for (const v of map.values()) sumAttributed += v;
  sumAttributed = Number(sumAttributed.toFixed(2));
  const gt = Number(Number(grandTotal || 0).toFixed(2));

  /* Si la suma atribuida supera al total real del local (solapes en datos), escalar para cuadrar con `gt`. */
  if (gt > 0 && sumAttributed > gt + 0.01) {
    const scale = gt / sumAttributed;
    for (const k of map.keys()) {
      map.set(k, Number((Number(map.get(k) || 0) * scale).toFixed(2)));
    }
    sumAttributed = gt;
  }

  const other = Number((gt - sumAttributed).toFixed(2));

  const eventIds = [...map.keys()];
  const events =
    eventIds.length > 0
      ? await Event.findAll({
          where: { venueId, status: { [Op.ne]: 'cancelled' }, id: { [Op.in]: eventIds } },
          attributes: ['id', 'title'],
        })
      : [];
  const titleById = new Map(events.map((e) => [String(e.id), e.title]));

  const rows = eventIds
    .map((id) => ({
      eventId: id,
      eventTitle: titleById.get(id) || 'Evento',
      total: Number(Number(map.get(id) || 0).toFixed(2)),
    }))
    .filter((r) => r.total > 0);

  if (other > 0.01) {
    rows.push({
      eventId: '__other__',
      eventTitle: 'Otros ingresos (bar / sin evento)',
      total: other,
    });
  }

  rows.sort((a, b) => b.total - a.total);

  let sumRows = rows.reduce((s, r) => s + Number(r.total || 0), 0);
  sumRows = Number(sumRows.toFixed(2));
  const delta = Number((gt - sumRows).toFixed(2));
  if (Math.abs(delta) > 0.02) {
    const oi = rows.findIndex((r) => r.eventId === '__other__');
    if (oi >= 0) {
      rows[oi].total = Number((rows[oi].total + delta).toFixed(2));
      if (rows[oi].total < 0.01) rows.splice(oi, 1);
    } else if (delta > 0.01) {
      rows.push({
        eventId: '__other__',
        eventTitle: 'Otros ingresos (bar / sin evento)',
        total: delta,
      });
    } else if (delta < -0.01 && rows.length > 0) {
      rows[0].total = Number((rows[0].total + delta).toFixed(2));
      if (rows[0].total < 0.01) rows.shift();
    }
  }

  return rows;
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

/** Combina varias series diarias { day, total } (misma firma que mergeDailySalesDigitalManual). */
function mergeDailySalesMany(seriesList) {
  const map = new Map();
  for (const series of seriesList) {
    for (const r of series || []) {
      const k = String(r.day);
      map.set(k, (map.get(k) || 0) + Number(r.total || 0));
    }
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([day, total]) => ({ day, total: Number(Number(total).toFixed(2)) }));
}

/** Combina series horarias { hour, total } y devuelve 00:00..23:00. */
function mergeHourlySalesMany(seriesList) {
  const map = new Map();
  for (const series of seriesList) {
    for (const r of series || []) {
      const h = Number(r.hour);
      if (!Number.isFinite(h) || h < 0 || h > 23) continue;
      map.set(h, (map.get(h) || 0) + Number(r.total || 0));
    }
  }
  const rows = [];
  for (let h = 0; h < 24; h += 1) {
    rows.push({
      hour: `${String(h).padStart(2, '0')}:00`,
      total: Number(Number(map.get(h) || 0).toFixed(2)),
    });
  }
  return rows;
}

/** Órdenes pagadas sin fila payment completada — mismo criterio que `sumPaidOrdersWithoutCompletedPayment`, por día. */
async function sumOrphanPaidOrdersByDay(venueId, from, to, eventId) {
  const evClause = eventId ? 'AND o.event_id = :eventId' : '';
  const rows = await sequelize.query(
    `
    SELECT date_trunc('day', o.created_at)::date AS day, COALESCE(SUM(${sqlOrderVenueNet('o')}), 0)::decimal AS total
    FROM orders o
    WHERE o.venue_id = :venueId
    AND o.status = 'paid'
    AND o.created_at BETWEEN :from AND :to
    ${evClause}
    AND (
      o.event_id IS NULL
      OR EXISTS (
        SELECT 1 FROM events ev
        WHERE ev.id = o.event_id
        AND ev.venue_id = :venueId
        AND ev.status <> 'cancelled'
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM payments p WHERE p.order_id = o.id AND p.status = 'completed'
    )
    GROUP BY 1
    ORDER BY 1 ASC
  `,
    { replacements: ticketVenueReplacements({ venueId, from, to, ...(eventId ? { eventId } : {}) }), type: QueryTypes.SELECT }
  );
  return rows.map((r) => ({ day: r.day, total: Number(r.total || 0) }));
}

/** Reservas con monto sin payment completado — mismo criterio que `sumReservationRevenueWithoutCompletedPayment`, por día. */
async function sumOrphanReservationAmountByDay(venueId, from, to, eventId) {
  const evClause = eventId ? 'AND r.event_id = :eventId' : '';
  const resNet = sqlReservationVenueNet('r');
  const rows = await sequelize.query(
    `
    SELECT date_trunc('day', r.created_at)::date AS day, COALESCE(SUM(${resNet}), 0)::decimal AS total
    FROM reservations r
    INNER JOIN events e ON r.event_id = e.id
    WHERE e.venue_id = :venueId
    AND e.status <> 'cancelled'
    AND r.status IN ('pending', 'confirmed', 'checked_in', 'completed')
    AND r.created_at BETWEEN :from AND :to
    ${evClause}
    AND NOT EXISTS (
      SELECT 1 FROM payments p WHERE p.reservation_id = r.id AND p.status = 'completed'
    )
    GROUP BY 1
    ORDER BY 1 ASC
  `,
    {
      replacements: ticketVenueReplacements({ venueId, from, to, ...(eventId ? { eventId } : {}) }),
      type: QueryTypes.SELECT,
    }
  );
  return rows.map((r) => ({ day: r.day, total: Number(r.total || 0) }));
}

async function queryCashClosingGrandByHour(venueId, from, to, eventId) {
  const eventClause = eventId ? 'AND cc.event_id = :eventId' : '';
  const rows = await sequelize.query(
    `
    SELECT EXTRACT(HOUR FROM cc.created_at)::int AS hour, COALESCE(SUM(cc.grand_total), 0)::decimal AS total
    FROM cash_closings cc
    WHERE cc.venue_id = :venueId
    AND cc.created_at BETWEEN :from AND :to
    ${eventClause}
    GROUP BY 1
    ORDER BY 1 ASC
  `,
    { replacements: { venueId, from, to, ...(eventId ? { eventId } : {}) }, type: QueryTypes.SELECT }
  );
  return rows.map((r) => ({ hour: Number(r.hour), total: Number(r.total || 0) }));
}

async function sumOrphanPaidOrdersByHour(venueId, from, to, eventId) {
  const evClause = eventId ? 'AND o.event_id = :eventId' : '';
  const rows = await sequelize.query(
    `
    SELECT EXTRACT(HOUR FROM o.created_at)::int AS hour, COALESCE(SUM(${sqlOrderVenueNet('o')}), 0)::decimal AS total
    FROM orders o
    WHERE o.venue_id = :venueId
    AND o.status = 'paid'
    AND o.created_at BETWEEN :from AND :to
    ${evClause}
    AND (
      o.event_id IS NULL
      OR EXISTS (
        SELECT 1 FROM events ev
        WHERE ev.id = o.event_id
        AND ev.venue_id = :venueId
        AND ev.status <> 'cancelled'
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM payments p WHERE p.order_id = o.id AND p.status = 'completed'
    )
    GROUP BY 1
    ORDER BY 1 ASC
  `,
    {
      replacements: ticketVenueReplacements({ venueId, from, to, ...(eventId ? { eventId } : {}) }),
      type: QueryTypes.SELECT,
    }
  );
  return rows.map((r) => ({ hour: Number(r.hour), total: Number(r.total || 0) }));
}

async function sumOrphanReservationAmountByHour(venueId, from, to, eventId) {
  const evClause = eventId ? 'AND r.event_id = :eventId' : '';
  const resNet = sqlReservationVenueNet('r');
  const rows = await sequelize.query(
    `
    SELECT EXTRACT(HOUR FROM r.created_at)::int AS hour, COALESCE(SUM(${resNet}), 0)::decimal AS total
    FROM reservations r
    INNER JOIN events e ON r.event_id = e.id
    WHERE e.venue_id = :venueId
    AND e.status <> 'cancelled'
    AND r.status IN ('pending', 'confirmed', 'checked_in', 'completed')
    AND r.created_at BETWEEN :from AND :to
    ${evClause}
    AND NOT EXISTS (
      SELECT 1 FROM payments p WHERE p.reservation_id = r.id AND p.status = 'completed'
    )
    GROUP BY 1
    ORDER BY 1 ASC
  `,
    {
      replacements: ticketVenueReplacements({ venueId, from, to, ...(eventId ? { eventId } : {}) }),
      type: QueryTypes.SELECT,
    }
  );
  return rows.map((r) => ({ hour: Number(r.hour), total: Number(r.total || 0) }));
}

async function countTicketsSoldInAnalyticsRange(venueId, from, to, eventId) {
  const where = { createdAt: { [Op.between]: [from, to] }, status: { [Op.in]: SOLD_TICKET_STATUSES } };
  if (eventId) {
    where.eventId = eventId;
    return Ticket.count({
      where,
      include: [
        {
          model: Event,
          as: 'event',
          where: { id: eventId, venueId, status: { [Op.ne]: 'cancelled' } },
          attributes: [],
          required: true,
        },
      ],
    });
  }
  return Ticket.count({
    where,
    include: [
      {
        model: Event,
        as: 'event',
        where: { venueId, status: { [Op.ne]: 'cancelled' } },
        attributes: [],
        required: true,
      },
    ],
  });
}

async function countReservationsCreatedInRange(venueId, from, to, eventId) {
  const where = { createdAt: { [Op.between]: [from, to] }, status: { [Op.in]: ACTIVE_RESERVATION_STATUSES } };
  if (eventId) {
    where.eventId = eventId;
    return Reservation.count({
      where,
      include: [
        {
          model: Event,
          as: 'event',
          where: { id: eventId, venueId, status: { [Op.ne]: 'cancelled' } },
          attributes: [],
          required: true,
        },
      ],
    });
  }
  return Reservation.count({
    where,
    include: [
      {
        model: Event,
        as: 'event',
        where: { venueId, status: { [Op.ne]: 'cancelled' } },
        attributes: [],
        required: true,
      },
    ],
  });
}

async function countPaidTicketOrdersInAnalyticsRange(venueId, from, to, eventId) {
  const where = {
    venueId,
    type: 'tickets',
    status: 'paid',
    createdAt: { [Op.between]: [from, to] },
  };
  if (eventId) where.eventId = eventId;
  return Order.count({
    where,
    include: [
      {
        model: Event,
        as: 'event',
        where: {
          venueId,
          status: { [Op.ne]: 'cancelled' },
          ...(eventId ? { id: eventId } : {}),
        },
        attributes: [],
        required: true,
      },
    ],
  });
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
  const payNet = sqlPaymentVenueNet('p');
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
      COALESCE(SUM(${payNet}), 0)::decimal AS total
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
      replacements: ticketVenueReplacements({ venueId, from, to, ...(eventId ? { eventId } : {}) }),
      type: QueryTypes.SELECT,
    }
  );
  const out = emptyChannelBreakdown();
  for (const row of rows) {
    addAmountToChannel(out, row.channel, row.method, row.total);
  }
  return finalizeChannelTotals(out);
}

async function queryOrphanRevenueByChannel(venueId, from, to, eventId) {
  const orderEventClause = eventId ? 'AND o.event_id = :eventId' : '';
  const reservationEventClause = eventId ? 'AND r.event_id = :eventId' : '';
  const [orderRows, reservationRows] = await Promise.all([
    sequelize.query(
      `
      SELECT
        CASE
          WHEN o.type = 'tickets' THEN 'entradas'
          ELSE 'consumo'
        END AS channel,
        COALESCE(SUM(${sqlOrderVenueNet('o')}), 0)::decimal AS total
      FROM orders o
      WHERE o.venue_id = :venueId
      AND o.status = 'paid'
      AND o.created_at BETWEEN :from AND :to
      ${orderEventClause}
      AND (
        o.event_id IS NULL
        OR EXISTS (
          SELECT 1 FROM events ev
          WHERE ev.id = o.event_id
          AND ev.venue_id = :venueId
          AND ev.status <> 'cancelled'
        )
      )
      AND NOT EXISTS (
        SELECT 1 FROM payments p WHERE p.order_id = o.id AND p.status = 'completed'
      )
      GROUP BY 1
    `,
      { replacements: ticketVenueReplacements({ venueId, from, to, ...(eventId ? { eventId } : {}) }), type: QueryTypes.SELECT }
    ),
    sequelize.query(
      `
      SELECT 'mesas' AS channel, COALESCE(SUM(${sqlReservationVenueNet('r')}), 0)::decimal AS total
      FROM reservations r
      INNER JOIN events e ON r.event_id = e.id
      WHERE e.venue_id = :venueId
      AND e.status <> 'cancelled'
      AND r.status IN ('pending', 'confirmed', 'checked_in', 'completed')
      AND r.created_at BETWEEN :from AND :to
      ${reservationEventClause}
      AND NOT EXISTS (
        SELECT 1 FROM payments p WHERE p.reservation_id = r.id AND p.status = 'completed'
      )
      GROUP BY 1
    `,
      { replacements: ticketVenueReplacements({ venueId, from, to, ...(eventId ? { eventId } : {}) }), type: QueryTypes.SELECT }
    ),
  ]);

  const out = emptyChannelBreakdown();
  for (const row of [...orderRows, ...reservationRows]) {
    addAmountToChannel(out, row.channel, 'other', row.total);
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
  const [digital, orphanDigital, manualReported] = await Promise.all([
    queryDigitalRevenueByChannel(venueId, from, to, eventId || null),
    queryOrphanRevenueByChannel(venueId, from, to, eventId || null),
    sumManualChannelBreakdown(venueId, from, to, eventId || null),
  ]);
  const digitalWithOrphans = mergeChannelBreakdowns(digital, orphanDigital);
  const combined = mergeChannelBreakdowns(digitalWithOrphans, manualReported);
  const digitalGrand = Object.values(digitalWithOrphans).reduce((s, x) => s + Number(x.total || 0), 0);
  const manualGrand = Object.values(manualReported).reduce((s, x) => s + Number(x.total || 0), 0);
  return {
    digital: digitalWithOrphans,
    digitalPayments: digital,
    digitalWithoutPaymentRows: orphanDigital,
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

/** Entradas vendidas (excl. canceladas / pendientes de pago en flujos legacy). */
async function countPaidTicketsInRange(venueId, start, end) {
  return Ticket.count({
    where: {
      createdAt: { [Op.between]: [start, end] },
      status: { [Op.in]: SOLD_TICKET_STATUSES },
    },
    include: [{ model: Event, as: 'event', where: { venueId }, attributes: [], required: true }],
  });
}

async function countReservationsNonCancelledInRange(venueId, start, end) {
  return Reservation.count({
    where: {
      createdAt: { [Op.between]: [start, end] },
      status: { [Op.notIn]: ['cancelled', 'no_show'] },
    },
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
    where: {
      eventId: activeEvent.id,
      status: { [Op.in]: SOLD_TICKET_STATUSES },
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
    countReservationsNonCancelledInRange(venueId, r.today.start, r.today.end),
    countReservationsNonCancelledInRange(venueId, r.prevToday.start, r.prevToday.end),
    countReservationsNonCancelledInRange(venueId, r.week.start, r.week.end),
    countReservationsNonCancelledInRange(venueId, r.prevWeek.start, r.prevWeek.end),
    countReservationsNonCancelledInRange(venueId, r.month.start, r.month.end),
    countReservationsNonCancelledInRange(venueId, r.prevMonth.start, r.prevMonth.end),
  ]);
  const [tt0, tt1, tw0, tw1, tm0, tm1] = await Promise.all([
    countPaidTicketsInRange(venueId, r.today.start, r.today.end),
    countPaidTicketsInRange(venueId, r.prevToday.start, r.prevToday.end),
    countPaidTicketsInRange(venueId, r.week.start, r.week.end),
    countPaidTicketsInRange(venueId, r.prevWeek.start, r.prevWeek.end),
    countPaidTicketsInRange(venueId, r.month.start, r.month.end),
    countPaidTicketsInRange(venueId, r.prevMonth.start, r.prevMonth.end),
  ]);
  const [mT0, mT1, mW0, mW1, mM0, mM1] = await Promise.all([
    venuePeriodRevenueTotal(venueId, r.today.start, r.today.end),
    venuePeriodRevenueTotal(venueId, r.prevToday.start, r.prevToday.end),
    venuePeriodRevenueTotal(venueId, r.week.start, r.week.end),
    venuePeriodRevenueTotal(venueId, r.prevWeek.start, r.prevWeek.end),
    venuePeriodRevenueTotal(venueId, r.month.start, r.month.end),
    venuePeriodRevenueTotal(venueId, r.prevMonth.start, r.prevMonth.end),
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
  if (['pending', 'confirmed', 'checked_in', 'completed'].includes(resv.status)) return 'ocupada';
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
  const payNetR = sqlPaymentVenueNet('p');
  const daily = await sequelize.query(
    `
      SELECT date_trunc('day', p.created_at)::date AS day, COALESCE(SUM(${payNetR}),0)::decimal AS total
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
    { replacements: ticketVenueReplacements({ venueId, start, end }), type: QueryTypes.SELECT }
  );
  const byEvent = await sequelize.query(
    `
      SELECT e.id, e.title, COALESCE(SUM(${payNetR}),0)::decimal AS total
      FROM events e
      LEFT JOIN reservations r ON r.event_id = e.id
      LEFT JOIN payments p ON p.reservation_id = r.id AND p.status = 'completed'
      WHERE e.venue_id = :venueId
      GROUP BY e.id, e.title
      ORDER BY total DESC NULLS LAST
      LIMIT 20
    `,
    { replacements: ticketVenueReplacements({ venueId }), type: QueryTypes.SELECT }
  );
  const methods = await sequelize.query(
    `
      SELECT p.method, COALESCE(SUM(${payNetR}),0)::decimal AS total
      FROM payments p
      LEFT JOIN orders o ON p.order_id = o.id
      LEFT JOIN reservations r ON p.reservation_id = r.id
      LEFT JOIN events e ON r.event_id = e.id
      WHERE p.status = 'completed'
      AND (o.venue_id = :venueId OR e.venue_id = :venueId)
      GROUP BY p.method
    `,
    { replacements: ticketVenueReplacements({ venueId }), type: QueryTypes.SELECT }
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
    if (ev) balanceEventoRD = await sumPaymentRevenue(venueId, ev.startAt, ev.endAt, eventId);
  }
  return { cierre, balanceEventoRD };
}

async function deleteCashClosing({ venueId, closingId }) {
  const row = await CashClosing.findOne({ where: { id: closingId, venueId } });
  if (!row) return { deleted: false };
  await row.destroy();
  return { deleted: true };
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

  const eventWhere = { venueId, status: { [Op.ne]: 'cancelled' } };
  if (eventId) eventWhere.id = eventId;
  const events = await Event.findAll({ where: eventWhere, attributes: ['id', 'title', 'maxCapacity', 'startAt', 'endAt'] });
  const eventIds = events.map((e) => e.id);

  const ticketToday = eventIds.length
    ? await Ticket.count({
        where: {
          eventId: { [Op.in]: eventIds },
          createdAt: { [Op.between]: [todayStart, todayEnd] },
          status: { [Op.in]: SOLD_TICKET_STATUSES },
        },
      })
    : 0;
  const ticketTotal = await countTicketsSoldInAnalyticsRange(venueId, from, to, eventId);
  const ticketOrdersTotal = await countPaidTicketOrdersInAnalyticsRange(venueId, from, to, eventId);

  const resToday = eventIds.length
    ? await Reservation.count({
        where: { eventId: { [Op.in]: eventIds }, createdAt: { [Op.between]: [todayStart, todayEnd] } },
      })
    : 0;
  const resTotal = await countReservationsCreatedInRange(venueId, from, to, eventId);

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
    periodRevenueGrand,
  ] = await Promise.all([
    sumPaymentRevenue(venueId, todayStart, todayEnd, eventId),
    sumCashClosingGrandTotal(venueId, todayStart, todayEnd, eventId),
    sumPaymentRevenue(venueId, yStart, yEnd, eventId),
    sumCashClosingGrandTotal(venueId, yStart, yEnd, eventId),
    sumPaymentRevenue(venueId, epoch, todayEnd, eventId),
    sumCashClosingGrandTotal(venueId, epoch, todayEnd, eventId),
    venuePeriodRevenueTotal(venueId, from, to, eventId),
  ]);
  const revenueToday = revenueTodayDigital + manualToday;
  const revenueYesterday = revenueYesterdayDigital + manualYesterday;
  const revenueTotalAllTime = revenueTotalDigital + manualAllTime;

  const occ = await occupancySnapshot(venue);

  const eventPayClause = eventId
    ? `AND (
        (o.id IS NOT NULL AND o.event_id = :eventId)
        OR (r.id IS NOT NULL AND r.event_id = :eventId)
      )`
    : '';

  const payNetA = sqlPaymentVenueNet('p');
  const [salesRows, manualByDay, orphanOrdDay, orphanResDay, salesRowsByHour, manualByHour, orphanOrdHour, orphanResHour] = await Promise.all([
    sequelize.query(
      `
      SELECT date_trunc('day', p.created_at)::date AS day, COALESCE(SUM(${payNetA}), 0)::decimal AS total
      FROM payments p
      LEFT JOIN orders o ON p.order_id = o.id
      LEFT JOIN reservations r ON p.reservation_id = r.id
      LEFT JOIN events e ON r.event_id = e.id
      WHERE p.status = 'completed'
      AND p.created_at BETWEEN :from AND :to
      AND (o.venue_id = :venueId OR e.venue_id = :venueId)
      ${eventPayClause}
      GROUP BY 1
      ORDER BY 1 ASC
    `,
      {
        replacements: ticketVenueReplacements({ from, to, venueId, ...(eventId ? { eventId } : {}) }),
        type: QueryTypes.SELECT,
      }
    ),
    queryCashClosingGrandByDay(venueId, from, to, eventId),
    sumOrphanPaidOrdersByDay(venueId, from, to, eventId),
    sumOrphanReservationAmountByDay(venueId, from, to, eventId),
    sequelize.query(
      `
      SELECT EXTRACT(HOUR FROM p.created_at)::int AS hour, COALESCE(SUM(${payNetA}), 0)::decimal AS total
      FROM payments p
      LEFT JOIN orders o ON p.order_id = o.id
      LEFT JOIN reservations r ON p.reservation_id = r.id
      LEFT JOIN events e ON r.event_id = e.id
      WHERE p.status = 'completed'
      AND p.created_at BETWEEN :from AND :to
      AND (o.venue_id = :venueId OR e.venue_id = :venueId)
      ${eventPayClause}
      GROUP BY 1
      ORDER BY 1 ASC
    `,
      {
        replacements: ticketVenueReplacements({ from, to, venueId, ...(eventId ? { eventId } : {}) }),
        type: QueryTypes.SELECT,
      }
    ),
    queryCashClosingGrandByHour(venueId, from, to, eventId),
    sumOrphanPaidOrdersByHour(venueId, from, to, eventId),
    sumOrphanReservationAmountByHour(venueId, from, to, eventId),
  ]);

  const salesByDayDigital = salesRows.map((r) => ({ day: r.day, total: Number(r.total || 0) }));
  const salesByDay = mergeDailySalesMany([
    mergeDailySalesDigitalManual(salesByDayDigital, manualByDay),
    orphanOrdDay,
    orphanResDay,
  ]);
  const salesByHourDigital = salesRowsByHour.map((r) => ({ hour: Number(r.hour), total: Number(r.total || 0) }));
  const salesByHour = mergeHourlySalesMany([salesByHourDigital, manualByHour, orphanOrdHour, orphanResHour]);

  const entriesVsTables = await Promise.all(
    events.map(async (ev) => {
      const [tickets, mesas] = await Promise.all([
        Ticket.count({ where: { eventId: ev.id, status: { [Op.in]: SOLD_TICKET_STATUSES } } }),
        Reservation.count({ where: { eventId: ev.id, status: { [Op.in]: ACTIVE_RESERVATION_STATUSES } } }),
      ]);
      return { eventId: ev.id, eventTitle: ev.title, tickets, tables: mesas };
    })
  );

  /** Misma fuente que Ventas / sales-metrics: pagos netos (mesas sin comisión plataforma) + órdenes huérfanas + cierres. */
  const revenueByEventAttributed = await venueAttributedRevenueByEventRows(
    venueId,
    from,
    to,
    periodRevenueGrand,
    eventId
  );
  const revenueByEvent = revenueByEventAttributed
    .filter((r) => r.eventId !== '__other__')
    .map((r) => ({
      eventId: r.eventId,
      eventTitle: r.eventTitle,
      total: r.total,
    }));

  const top5Events = [...entriesVsTables].sort((a, b) => b.tickets - a.tickets).slice(0, 5);

  const occupancyByEvent = await Promise.all(
    events.map(async (ev) => {
      const [party, tix] = await Promise.all([
        Reservation.sum('partySize', {
          where: { eventId: ev.id, status: { [Op.in]: ACTIVE_RESERVATION_STATUSES } },
        }),
        Ticket.count({ where: { eventId: ev.id, status: { [Op.in]: SOLD_TICKET_STATUSES } } }),
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

  let eventInsights = null;
  if (eventId && events.length === 1) {
    const evId = events[0].id;
    try {
      const peakRows = await sequelize.query(
        `
        SELECT EXTRACT(HOUR FROM p.created_at)::int AS h, COALESCE(SUM(p.amount), 0)::decimal AS amt
        FROM payments p
        INNER JOIN orders o ON p.order_id = o.id
        WHERE p.status = 'completed'
        AND o.event_id = :evId
        AND p.created_at BETWEEN :from AND :to
        GROUP BY EXTRACT(HOUR FROM p.created_at)
        ORDER BY amt DESC
        LIMIT 1
      `,
        { replacements: { evId, from, to }, type: QueryTypes.SELECT }
      );
      const ticketTypeRows = await sequelize.query(
        `
        SELECT ticket_type AS name, COUNT(DISTINCT COALESCE(order_id::text, id::text))::int AS n
        FROM tickets
        WHERE event_id = :evId
        AND created_at BETWEEN :from AND :to
        AND status IN ('paid', 'valid', 'used')
        GROUP BY ticket_type
        ORDER BY n DESC
        LIMIT 1
      `,
        { replacements: { evId, from, to }, type: QueryTypes.SELECT }
      );
      const paidTixForNs = await Order.count({
        where: { venueId, eventId: evId, type: 'tickets', status: 'paid' },
      });
      const scansOk = await AccessLog.count({ where: { eventId: evId, success: true } });
      let noShowPct = null;
      if (paidTixForNs > 0) {
        const raw = Math.round(((paidTixForNs - scansOk) / paidTixForNs) * 100);
        noShowPct = Math.max(0, Math.min(100, raw));
      }
      eventInsights = {
        peakHourLabel: peakRows[0]?.h != null ? `${String(peakRows[0].h).padStart(2, '0')}:00` : null,
        topTicketType: ticketTypeRows[0]?.name ?? null,
        noShowPct,
        validatedCount: scansOk,
      };
    } catch (e) {
      console.error('[getAnalytics] eventInsights', e?.message || e);
    }
  }

  return {
    summary: {
      tickets: {
        today: ticketToday,
        total: ticketTotal,
        orders: ticketOrdersTotal,
        deltaVsYesterday: ticketToday - Math.max(ticketTotal - ticketToday, 0),
      },
      reservations: { today: resToday, total: resTotal, deltaVsYesterday: resToday - Math.max(resTotal - resToday, 0) },
      revenue: {
        today: revenueToday,
        /** Ingresos reales en [from,to] — misma lógica que `venuePeriodRevenueTotal` (pagos + cierres + órdenes/reservas sin payment). */
        total: periodRevenueGrand,
        allTime: revenueTotalAllTime,
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
      salesByHour,
      entriesVsTables,
      revenueByEvent: revenueByEvent.sort((a, b) => b.total - a.total),
    },
    tables: {
      top5Events,
      occupancyByEvent: occupancyByEvent.sort((a, b) => b.occupancyRate - a.occupancyRate),
    },
    revenueChannels,
    filter: { range, eventId },
    eventInsights,
  };
}

/**
 * Tendencia solo si ambos períodos tienen ingresos relevantes (≥ 1 RD$).
 * Evita % engañosos por “polvo” contable o mes anterior sin ventas reales.
 */
const MIN_SALES_RD_FOR_TREND = 1;

function buildSalesPeriodMeta(current, previous) {
  const c = Number(current) || 0;
  const p = Number(previous) || 0;
  if (p < MIN_SALES_RD_FOR_TREND || c < MIN_SALES_RD_FOR_TREND) {
    return {
      total: c,
      previousTotal: p,
      percentChange: null,
      trend: null,
      hasComparison: false,
    };
  }
  const percentChange = Number((((c - p) / p) * 100).toFixed(2));
  let trend = 'neutral';
  if (percentChange > 0) trend = 'up';
  else if (percentChange < 0) trend = 'down';
  return {
    total: c,
    previousTotal: p,
    percentChange,
    trend,
    hasComparison: true,
  };
}

function sumRevenueByEventRows(rows) {
  return Number(
    rows.reduce((s, r) => s + Number(r.total || 0), 0).toFixed(2)
  );
}

/**
 * Panel Ventas (móvil): ventanas explícitas — semana = últimos 7 días; mes = últimos 30 días;
 * totales = pagos + cierres + órdenes sin payment; lista por evento = misma regla (mes).
 */
async function getSalesPanelMetrics({ venueId }) {
  const posService = require('./pos.service');
  const rsp = rangesSalesPanelMobile();

  const [
    mT0,
    mT1,
    mW0,
    mW1,
    mM0,
    mM1,
    ticketsToday,
    resToday,
    ordersSum,
    orderRevenueToday,
    orderRevenueMonth,
    paidOrdersMonth,
  ] = await Promise.all([
    venuePeriodRevenueTotal(venueId, rsp.today.start, rsp.today.end),
    venuePeriodRevenueTotal(venueId, rsp.prevToday.start, rsp.prevToday.end),
    venuePeriodRevenueTotal(venueId, rsp.week7.start, rsp.week7.end),
    venuePeriodRevenueTotal(venueId, rsp.prevWeek7.start, rsp.prevWeek7.end),
    venuePeriodRevenueTotal(venueId, rsp.month.start, rsp.month.end),
    venuePeriodRevenueTotal(venueId, rsp.prevMonth.start, rsp.prevMonth.end),
    countPaidTicketsInRange(venueId, rsp.today.start, rsp.today.end),
    countReservationsNonCancelledInRange(venueId, rsp.today.start, rsp.today.end),
    posService.getDashboardOrdersSummary({ venueId, eventId: null, period: 'today' }).catch((e) => {
      console.error('[getSalesPanelMetrics] orders summary:', e?.message || e);
      return {
        totalOrders: 0,
        revenueCollected: 0,
        pendingCount: 0,
        completedCount: 0,
        refundedCount: 0,
        avgTicket: 0,
      };
    }),
    sumPaidOrderTotalsInRange(venueId, rsp.today.start, rsp.today.end),
    sumPaidOrderTotalsInRange(venueId, rsp.month.start, rsp.month.end),
    countPaidOrdersInRange(venueId, rsp.month.start, rsp.month.end),
  ]);

  const revenueByEvent = await venueAttributedRevenueByEventRows(
    venueId,
    rsp.month.start,
    rsp.month.end,
    mM0
  );
  const monthSumFromBreakdown = sumRevenueByEventRows(revenueByEvent);

  const revenueByEventPrevMonth = await venueAttributedRevenueByEventRows(
    venueId,
    rsp.prevMonth.start,
    rsp.prevMonth.end,
    mM1
  );
  const prevMonthSumFromBreakdown = sumRevenueByEventRows(revenueByEventPrevMonth);

  let averageTicket = null;
  let averageTicketNote = 'no_orders';
  if (paidOrdersMonth > 0) {
    averageTicket = Number((orderRevenueMonth / paidOrdersMonth).toFixed(2));
    averageTicketNote = 'ok';
  } else if (mM0 > 0) {
    averageTicketNote = 'insufficient';
  }

  return {
    today: buildSalesPeriodMeta(mT0, mT1),
    week: buildSalesPeriodMeta(mW0, mW1),
    month: buildSalesPeriodMeta(monthSumFromBreakdown, prevMonthSumFromBreakdown),
    averageTicket,
    averageTicketNote,
    paidOrdersToday: ordersSum.completedCount,
    orderRevenueToday,
    ticketsSoldToday: ticketsToday,
    reservationsToday: resToday,
    ordersToday: {
      total: ordersSum.totalOrders,
      pending: ordersSum.pendingCount,
      completed: ordersSum.completedCount,
    },
    revenueByEvent,
    periodLabels: {
      week: 'Últimos 7 días',
      month: 'Últimos 30 días',
      revenueByEventScope: '30d',
    },
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
  getSalesPanelMetrics,
  listCashClosings,
  createCashClosing,
  deleteCashClosing,
};
