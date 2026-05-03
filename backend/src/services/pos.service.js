const { Product, Order, OrderItem, Venue, VenueTable, Payment, Event, User } = require('../models');

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

async function listDashboardOrders({ venueId, eventId = null }) {
  const where = { venueId, status: { $in: ['open', 'paid'] } };
  if (eventId) where.eventId = eventId;
  // Sequelize v6 still handles operator aliases off by default; use Op not alias:
  delete where.status;
  const { Op } = require('sequelize');
  where.status = { [Op.in]: ['open', 'paid'] };

  const data = await Order.findAll({
    where,
    include: [
      { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] },
      { model: VenueTable, as: 'table' },
      { model: Event, as: 'event' },
      { model: User, as: 'waiter', attributes: ['id', 'fullName'], required: false },
    ],
    order: [['createdAt', 'DESC']],
  });
  return { data };
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

module.exports = {
  listProducts,
  createProduct,
  createOrder,
  addOrderItems,
  payOrder,
  listOpenOrders,
  listDashboardOrders,
  createDashboardOrder,
  addDashboardOrderItems,
  closeDashboardOrder,
  ordersByTable,
};
