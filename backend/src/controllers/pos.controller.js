const posService = require('../services/pos.service');

async function listProducts(req, res) {
  try {
    return res.json(
      await posService.listProducts({
        venueId: req.params.venueId,
        userId: req.userId,
        userRole: req.user.role,
      })
    );
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.status ? e.message : 'Error al listar productos' });
  }
}

async function createProduct(req, res) {
  try {
    return res.status(201).json(
      await posService.createProduct({
        body: req.body,
        userId: req.userId,
        userRole: req.user.role,
      })
    );
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.status ? e.message : 'Error al crear producto' });
  }
}

async function createOrder(req, res) {
  try {
    return res.status(201).json(
      await posService.createOrder({
        body: req.body,
        userId: req.userId,
        userRole: req.user.role,
      })
    );
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.status ? e.message : 'Error al crear orden' });
  }
}

async function addOrderItems(req, res) {
  try {
    return res.json(
      await posService.addOrderItems({
        orderId: req.params.orderId,
        body: req.body,
        userId: req.userId,
        userRole: req.user.role,
      })
    );
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.status ? e.message : 'Error al agregar ítems' });
  }
}

async function payOrder(req, res) {
  try {
    return res.json(
      await posService.payOrder({
        orderId: req.params.orderId,
        method: req.body.method,
        userId: req.userId,
        userRole: req.user.role,
      })
    );
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.status ? e.message : 'Error al pagar orden' });
  }
}

async function listOpenOrders(req, res) {
  try {
    return res.json(
      await posService.listOpenOrders({
        venueId: req.params.venueId,
        userId: req.userId,
        userRole: req.user.role,
      })
    );
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.status ? e.message : 'Error al listar órdenes abiertas' });
  }
}

async function listDashboardOrders(req, res) {
  try {
    return res.json(await posService.listDashboardOrders({ venueId: req.venueId, eventId: req.query.eventId || null }));
  } catch (e) {
    return res.status(500).json({ error: 'Error al listar órdenes' });
  }
}

async function createDashboardOrder(req, res) {
  try {
    return res.status(201).json(
      await posService.createDashboardOrder({
        venueId: req.venueId,
        body: req.body,
        userId: req.userId,
      })
    );
  } catch (e) {
    return res.status(500).json({ error: 'Error al crear orden' });
  }
}

async function addDashboardOrderItems(req, res) {
  try {
    return res.json(
      await posService.addDashboardOrderItems({
        venueId: req.venueId,
        orderId: req.params.orderId,
        body: req.body,
      })
    );
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.status ? e.message : 'Error al agregar ítems' });
  }
}

async function closeDashboardOrder(req, res) {
  try {
    return res.json(
      await posService.closeDashboardOrder({
        venueId: req.venueId,
        orderId: req.params.orderId,
        method: req.body.method || 'cash',
      })
    );
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.status ? e.message : 'Error al cerrar orden' });
  }
}

async function ordersByTable(req, res) {
  try {
    return res.json(await posService.ordersByTable({ venueId: req.venueId, eventId: req.query.eventId || null }));
  } catch (e) {
    return res.status(500).json({ error: 'Error al agrupar por mesa' });
  }
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
