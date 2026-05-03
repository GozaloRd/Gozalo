/**
 * ⚠️ ARCHIVO LEGACY - NO USAR
 *
 * Este archivo fue reemplazado por:
 * - routes/pos.routes.js
 */
const express = require('express');
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const {
  Product,
  Order,
  OrderItem,
  Venue,
  VenueTable,
  Payment,
  Event,
} = require('../models');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

async function assertVenueAccess(req, venueId) {
  const venue = await Venue.findByPk(venueId);
  if (!venue) return { error: 'Local no encontrado', status: 404 };
  if (req.user.role !== 'admin' && venue.ownerId !== req.userId) {
    return { error: 'No autorizado', status: 403 };
  }
  return { venue };
}

router.get(
  '/products/:venueId',
  authenticate,
  requireRole('venue_owner', 'admin', 'staff'),
  async (req, res) => {
    const check = await assertVenueAccess(req, req.params.venueId);
    if (check.error) return res.status(check.status).json({ error: check.error });
    const products = await Product.findAll({
      where: { venueId: req.params.venueId, active: true },
      order: [['category', 'ASC'], ['name', 'ASC']],
    });
    res.json(products);
  }
);

router.post(
  '/products',
  authenticate,
  requireRole('venue_owner', 'admin'),
  [
    body('venueId').isUUID(),
    body('name').trim().notEmpty(),
    body('category').trim().notEmpty(),
    body('price').isFloat({ min: 0 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const check = await assertVenueAccess(req, req.body.venueId);
    if (check.error) return res.status(check.status).json({ error: check.error });
    const p = await Product.create({
      venueId: req.body.venueId,
      name: req.body.name,
      sku: req.body.sku,
      category: req.body.category,
      price: req.body.price,
    });
    res.status(201).json(p);
  }
);

router.post(
  '/orders',
  authenticate,
  requireRole('venue_owner', 'admin', 'staff'),
  [body('venueId').isUUID(), body('tableId').optional().isUUID(), body('eventId').optional().isUUID()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const check = await assertVenueAccess(req, req.body.venueId);
    if (check.error) return res.status(check.status).json({ error: check.error });
    const order = await Order.create({
      venueId: req.body.venueId,
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
    res.status(201).json(order);
  }
);

router.post(
  '/orders/:orderId/items',
  authenticate,
  requireRole('venue_owner', 'admin', 'staff'),
  [body('productId').isUUID(), body('quantity').isInt({ min: 1 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const order = await Order.findByPk(req.params.orderId, { include: [{ model: Venue, as: 'venue' }] });
    if (!order) return res.status(404).json({ error: 'Orden no encontrada' });
    const check = await assertVenueAccess(req, order.venueId);
    if (check.error) return res.status(check.status).json({ error: check.error });
    const product = await Product.findByPk(req.body.productId);
    if (!product || product.venueId !== order.venueId) {
      return res.status(400).json({ error: 'Producto inválido' });
    }
    const lineTotal = Number(product.price) * req.body.quantity;
    await OrderItem.create({
      orderId: order.id,
      productId: product.id,
      quantity: req.body.quantity,
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
    res.json({ order, items });
  }
);

router.post(
  '/orders/:orderId/pay',
  authenticate,
  requireRole('venue_owner', 'admin', 'staff'),
  [body('method').isIn(['cash', 'card', 'transfer', 'other'])],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const order = await Order.findByPk(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Orden no encontrada' });
    const check = await assertVenueAccess(req, order.venueId);
    if (check.error) return res.status(check.status).json({ error: check.error });
    const commissionRate = 0.05;
    const commissionAmount = Number(order.total) * commissionRate;
    const payment = await Payment.create({
      orderId: order.id,
      amount: order.total,
      method: req.body.method,
      status: 'completed',
      commissionAmount,
    });
    order.status = 'paid';
    await order.save();
    res.json({ order, payment });
  }
);

router.get(
  '/orders/open/:venueId',
  authenticate,
  requireRole('venue_owner', 'admin', 'staff'),
  async (req, res) => {
    const check = await assertVenueAccess(req, req.params.venueId);
    if (check.error) return res.status(check.status).json({ error: check.error });
    const orders = await Order.findAll({
      where: { venueId: req.params.venueId, status: 'open' },
      include: [
        { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] },
        { model: VenueTable, as: 'table' },
        { model: Event, as: 'event' },
      ],
    });
    res.json(orders);
  }
);

module.exports = router;
