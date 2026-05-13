const {
  Product,
  Order,
  OrderItem,
  Venue,
  VenueTable,
  Payment,
  Event,
  User,
  Ticket,
  sequelize,
} = require('../models');
const { Op, QueryTypes } = require('sequelize');

function ticketVenueNet(unitPrice) {
  return Number(Number(unitPrice || 0).toFixed(2));
}

function orderVenueNetFromRow(order) {
  const tickets = Array.isArray(order?.tickets)
    ? order.tickets.filter((t) => String(t?.status || '').toLowerCase() !== 'cancelled')
    : [];
  if (tickets.length > 0) {
    return Number(tickets.reduce((s, t) => s + ticketVenueNet(t.unitPrice), 0).toFixed(2));
  }
  const type = String(order?.type || '');
  /** Órdenes web solo-entradas sin líneas hidratadas: ingreso 0 hasta cargar tickets. */
  if (type === 'tickets' || type === 'mixed') {
    return 0;
  }

  const paid = Array.isArray(order?.payments)
    ? order.payments.find((p) => String(p.status || '').toLowerCase() === 'completed')
    : null;
  if (paid) {
    return Number(Number(paid.amount || 0).toFixed(2));
  }
  return Number(order?.total || 0);
}

async function attachTicketsToOrders(ordersJson) {
  const ids = ordersJson
    .filter(
      (o) =>
        (o.type === 'tickets' || o.type === 'mixed') && (!Array.isArray(o.tickets) || o.tickets.length === 0)
    )
    .map((o) => o.id);
  if (ids.length === 0) return;

  const rows = await Ticket.findAll({
    where: { orderId: { [Op.in]: ids }, status: { [Op.ne]: 'cancelled' } },
    attributes: ['id', 'orderId', 'ticketType', 'unitPrice', 'status', 'qrPayload'],
  });
  const map = new Map();
  for (const t of rows) {
    const oj = t.toJSON();
    if (!map.has(oj.orderId)) map.set(oj.orderId, []);
    map.get(oj.orderId).push(oj);
  }
  for (const o of ordersJson) {
    if (map.has(o.id)) {
      o.tickets = map.get(o.id);
    }
  }
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

function ticketVenueReplacements(extra = {}) {
  return { ...extra };
}

async function assertVenueAccess({ venueId, userRole, userId }) {
  const venue = await Venue.findByPk(venueId);
  if (!venue) {
    const err = new Error('Local no encontrado');
    err.status = 404;
    throw err;
  }
  if (userRole !== 'admin' && venue.ownerId !== userId) {
    const err = new Error('No autorizado');
    err.status = 403;
    throw err;
  }
  return venue;
}

/** Reembolso: solo plataforma admin o dueño del local (no staff). */
async function assertRefundPermission({ venueId, userId, userRole }) {
  if (userRole === 'admin') return;
  if (userRole !== 'venue_owner') {
    const err = new Error('Solo el propietario o un administrador pueden reembolsar');
    err.status = 403;
    throw err;
  }
  const venue = await Venue.findByPk(venueId);
  if (!venue || venue.ownerId !== userId) {
    const err = new Error('No autorizado');
    err.status = 403;
    throw err;
  }
}

async function listProducts({ venueId, userRole, userId }) {
  await assertVenueAccess({ venueId, userRole, userId });
  return Product.findAll({
    where: { venueId, active: true },
    order: [['category', 'ASC'], ['name', 'ASC']],
  });
}

async function createProduct({ body, userRole, userId }) {
  await assertVenueAccess({ venueId: body.venueId, userRole, userId });
  return Product.create({
    venueId: body.venueId,
    name: body.name,
    sku: body.sku,
    category: body.category,
    price: body.price,
  });
}

async function createOrder({ body, userId, userRole }) {
  await assertVenueAccess({ venueId: body.venueId, userRole, userId });
  return Order.create({
    venueId: body.venueId,
    tableId: body.tableId || null,
    eventId: body.eventId || null,
    userId: body.customerUserId || null,
    waiterId: userId,
    type: 'pos',
    status: 'open',
    subtotal: 0,
    tax: 0,
    total: 0,
  });
}

async function addOrderItems({ orderId, body, userId, userRole }) {
  const order = await Order.findByPk(orderId, { include: [{ model: Venue, as: 'venue' }] });
  if (!order) {
    const err = new Error('Orden no encontrada');
    err.status = 404;
    throw err;
  }
  await assertVenueAccess({ venueId: order.venueId, userRole, userId });

  const product = await Product.findByPk(body.productId);
  if (!product || product.venueId !== order.venueId) {
    const err = new Error('Producto inválido');
    err.status = 400;
    throw err;
  }

  const lineTotal = Number(product.price) * body.quantity;
  await OrderItem.create({
    orderId: order.id,
    productId: product.id,
    quantity: body.quantity,
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
  return { order, items };
}

async function payOrder({ orderId, method, userId, userRole }) {
  const order = await Order.findByPk(orderId);
  if (!order) {
    const err = new Error('Orden no encontrada');
    err.status = 404;
    throw err;
  }
  await assertVenueAccess({ venueId: order.venueId, userRole, userId });

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
  return { order, payment };
}

async function listOpenOrders({ venueId, userId, userRole }) {
  await assertVenueAccess({ venueId, userRole, userId });
  return Order.findAll({
    where: { venueId, status: 'open' },
    include: [
      { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] },
      { model: VenueTable, as: 'table' },
      { model: Event, as: 'event' },
    ],
  });
}

function buildPeriodClause(period) {
  const { Op } = require('sequelize');
  if (!period || period === 'all') return null;
  const start = new Date();
  if (period === 'today') {
    start.setHours(0, 0, 0, 0);
  } else if (period === 'week') {
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
  } else if (period === 'month') {
    start.setDate(start.getDate() - 30);
    start.setHours(0, 0, 0, 0);
  } else {
    return null;
  }
  return { [Op.gte]: start };
}

/**
 * Filtros compartidos entre listado y resumen (órdenes dashboard).
 */
function buildDashboardOrdersWhere({
  venueId,
  eventId = null,
  period = 'all',
  statusFilter = 'all',
  typeFilter = 'all',
  search = '',
}) {
  const { Op } = require('sequelize');
  const where = { venueId };
  if (eventId) where.eventId = eventId;

  const periodClause = buildPeriodClause(period);
  if (periodClause) where.createdAt = periodClause;

  const sf = String(statusFilter).toLowerCase();
  if (sf === 'open' || sf === 'pending') {
    where.status = 'open';
  } else if (sf === 'paid' || sf === 'completed') {
    where.status = 'paid';
  } else if (sf === 'cancelled') {
    where.status = 'cancelled';
  } else if (sf === 'refunded') {
    where.status = 'cancelled';
    where[Op.and] = [
      ...(where[Op.and] || []),
      sequelize.literal(`EXISTS (
        SELECT 1 FROM payments AS p
        WHERE p.order_id = "Order"."id" AND p.status = 'refunded'
      )`),
    ];
  } else {
    where.status = { [Op.in]: ['open', 'paid', 'cancelled'] };
  }

  const tf = String(typeFilter).toLowerCase();
  if (tf === 'tickets') {
    where[Op.and] = [
      ...(where[Op.and] || []),
      {
        [Op.or]: [
          { type: { [Op.in]: ['tickets', 'mixed'] } },
          sequelize.literal(`EXISTS (SELECT 1 FROM tickets AS t WHERE t.order_id = "Order"."id")`),
        ],
      },
    ];
  } else if (tf === 'mesas') {
    where.tableId = { [Op.ne]: null };
  }

  const q = String(search || '').trim();
  if (q.length > 0) {
    const like = `%${q}%`;
    const digits = q.replace(/\D/g, '');
    const ors = [
      sequelize.where(sequelize.cast(sequelize.col('Order.id'), 'TEXT'), { [Op.iLike]: like }),
      sequelize.where(sequelize.cast(sequelize.col('Order.total'), 'TEXT'), { [Op.iLike]: like }),
      { '$user.fullName$': { [Op.iLike]: like } },
      { '$user.email$': { [Op.iLike]: like } },
      { '$user.phone$': { [Op.iLike]: like } },
    ];
    if (digits.length >= 3) {
      ors.push(sequelize.where(sequelize.cast(sequelize.col('Order.total'), 'TEXT'), { [Op.iLike]: `%${digits}%` }));
    }
    where[Op.and] = [...(where[Op.and] || []), { [Op.or]: ors }];
  }

  return where;
}

async function getDashboardOrdersSummary({ venueId, eventId = null, period = 'today' }) {
  const allWhere = buildDashboardOrdersWhere({
    venueId,
    eventId,
    period,
    statusFilter: 'all',
    typeFilter: 'all',
    search: '',
  });
  const paidWhere = buildDashboardOrdersWhere({
    venueId,
    eventId,
    period,
    statusFilter: 'completed',
    typeFilter: 'all',
    search: '',
  });
  const openWhere = buildDashboardOrdersWhere({
    venueId,
    eventId,
    period,
    statusFilter: 'pending',
    typeFilter: 'all',
    search: '',
  });

  const totalOrders = await Order.count({ where: allWhere });
  const completedCount = await Order.count({ where: paidWhere });
  const pendingCount = await Order.count({ where: openWhere });
  const pc = buildPeriodClause(period);

  const rows = await sequelize.query(
    `
    SELECT COALESCE(SUM(${sqlOrderVenueNet('o')}), 0)::decimal AS total
    FROM orders o
    WHERE o.venue_id = :venueId
    AND o.status = 'paid'
    ${eventId ? 'AND o.event_id = :eventId' : ''}
    ${pc ? 'AND o.created_at BETWEEN :periodStart AND :periodEnd' : ''}
  `,
    {
      replacements: ticketVenueReplacements({
        venueId,
        ...(eventId ? { eventId } : {}),
        ...(pc ? { periodStart: pc[Op.between][0], periodEnd: pc[Op.between][1] } : {}),
      }),
      type: QueryTypes.SELECT,
    }
  );
  const revenueCollected = Number(rows[0]?.total || 0);

  const refundedWhere = {
    venueId,
    status: 'cancelled',
    ...(eventId ? { eventId } : {}),
  };
  if (pc) refundedWhere.createdAt = pc;

  const refundedCount = await Order.count({
    where: refundedWhere,
    include: [
      {
        model: Payment,
        as: 'payments',
        where: { status: 'refunded' },
        required: true,
        attributes: [],
      },
    ],
    distinct: true,
    col: 'id',
    subQuery: false,
  });

  const avgTicket =
    completedCount > 0 ? Math.round((revenueCollected / completedCount) * 100) / 100 : 0;

  return {
    totalOrders,
    revenueCollected,
    pendingCount,
    completedCount,
    refundedCount,
    avgTicket,
  };
}

async function listDashboardOrders({
  venueId,
  eventId = null,
  limit = 20,
  offset = 0,
  statusFilter = 'all',
  period = 'all',
  typeFilter = 'all',
  search = '',
}) {
  const where = buildDashboardOrdersWhere({
    venueId,
    eventId,
    period,
    statusFilter,
    typeFilter,
    search,
  });

  const lim = Math.min(100, Math.max(1, Number(limit) || 20));
  const off = Math.max(0, Number(offset) || 0);

  const qTrim = String(search || '').trim();

  const includeBase = [
    {
      model: OrderItem,
      as: 'items',
      separate: true,
      include: [{ model: Product, as: 'product' }],
    },
    { model: VenueTable, as: 'table' },
    { model: Event, as: 'event' },
    { model: User, as: 'user', attributes: ['id', 'fullName', 'email', 'phone'], required: false },
    { model: User, as: 'waiter', attributes: ['id', 'fullName'], required: false },
    { model: Payment, as: 'payments', required: false },
    { model: Ticket, as: 'tickets', required: false, separate: true },
  ];

  let total;
  try {
    total =
      qTrim.length > 0
        ? await Order.count({
            where,
            include: [{ model: User, as: 'user', required: false, attributes: [] }],
            distinct: true,
            col: 'id',
            subQuery: false,
          })
        : await Order.count({ where });
  } catch (err) {
    console.warn('[listDashboardOrders] count fallback:', err.message);
    total = await Order.count({ where });
  }

  let data;
  try {
    data = await Order.findAll({
      where,
      include: includeBase,
      order: [['createdAt', 'DESC']],
      limit: lim,
      offset: off,
    });
  } catch (err) {
    console.warn('[listDashboardOrders] findAll fallback (sin separate):', err.message);
    const includeSimple = [
      {
        model: OrderItem,
        as: 'items',
        include: [{ model: Product, as: 'product' }],
      },
      { model: VenueTable, as: 'table' },
      { model: Event, as: 'event' },
      { model: User, as: 'user', attributes: ['id', 'fullName', 'email', 'phone'], required: false },
      { model: User, as: 'waiter', attributes: ['id', 'fullName'], required: false },
      { model: Payment, as: 'payments', required: false },
      { model: Ticket, as: 'tickets', required: false },
    ];
    data = await Order.findAll({
      where,
      include: includeSimple,
      order: [['createdAt', 'DESC']],
      limit: lim,
      offset: off,
      subQuery: false,
    });
  }

  const jsons = data.map((o) => (typeof o.toJSON === 'function' ? o.toJSON() : o));
  await attachTicketsToOrders(jsons);
  const normalized = jsons.map((json) => ({ ...json, venueNetTotal: orderVenueNetFromRow(json) }));
  return { data: normalized, total, hasMore: off + normalized.length < total };
}

async function createDashboardOrder({ venueId, body, userId }) {
  return Order.create({
    venueId,
    tableId: body.tableId || null,
    eventId: body.eventId || null,
    userId: body.customerUserId || null,
    waiterId: userId,
    type: 'pos',
    status: 'open',
    subtotal: 0,
    tax: 0,
    total: 0,
  });
}

async function addDashboardOrderItems({ venueId, orderId, body }) {
  const order = await Order.findByPk(orderId);
  if (!order || order.venueId !== venueId) {
    const err = new Error('Orden no encontrada');
    err.status = 404;
    throw err;
  }
  const product = await Product.findByPk(body.productId);
  if (!product || product.venueId !== venueId) {
    const err = new Error('Producto inválido');
    err.status = 400;
    throw err;
  }
  const qty = body.quantity || 1;
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
  return { order, items };
}

async function closeDashboardOrder({ venueId, orderId, method = 'cash' }) {
  const order = await Order.findByPk(orderId);
  if (!order || order.venueId !== venueId) {
    const err = new Error('Orden no encontrada');
    err.status = 404;
    throw err;
  }
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
  return { order, payment };
}

async function ordersByTable({ venueId, eventId = null }) {
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
  return { porMesa: byTable };
}

async function resendOrderEmail({ venueId, orderId }) {
  const order = await Order.findOne({
    where: { id: orderId, venueId },
    include: [
      { model: User, as: 'user', attributes: ['id', 'fullName', 'email', 'phone'] },
      { model: Event, as: 'event' },
      {
        model: OrderItem,
        as: 'items',
        include: [{ model: Product, as: 'product' }],
      },
      { model: Ticket, as: 'tickets', required: false },
    ],
  });
  if (!order) {
    const err = new Error('Orden no encontrada');
    err.status = 404;
    throw err;
  }
  const emailService = require('./email.service');
  return emailService.sendOrderResend({ order });
}

async function refundDashboardOrder({ venueId, orderId, userId, userRole, reason }) {
  await assertRefundPermission({ venueId, userId, userRole });
  const order = await Order.findOne({
    where: { id: orderId, venueId },
    include: [{ model: User, as: 'user', attributes: ['id', 'fullName', 'email'], required: false }],
  });
  if (!order) {
    const err = new Error('Orden no encontrada');
    err.status = 404;
    throw err;
  }
  const payments = await Payment.findAll({ where: { orderId: order.id } });
  for (const p of payments) {
    p.status = 'refunded';
    await p.save();
  }
  order.status = 'cancelled';
  await order.save();
  const emailService = require('./email.service');
  await emailService.sendOrderRefundNotice({ order, reason: reason || '' }).catch(() => {});
  return { ok: true, orderId: order.id };
}

module.exports = {
  listProducts,
  createProduct,
  createOrder,
  addOrderItems,
  payOrder,
  listOpenOrders,
  listDashboardOrders,
  getDashboardOrdersSummary,
  createDashboardOrder,
  addDashboardOrderItems,
  closeDashboardOrder,
  ordersByTable,
  resendOrderEmail,
  refundDashboardOrder,
};
