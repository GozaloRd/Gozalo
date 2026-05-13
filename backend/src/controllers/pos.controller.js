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
    return res.json(
      await posService.listDashboardOrders({
        venueId: req.venueId,
        eventId: req.query.eventId || null,
        limit: req.query.limit,
        offset: req.query.offset,
        statusFilter: req.query.status || 'all',
        period: req.query.period || 'all',
        typeFilter: req.query.type || 'all',
        search: req.query.q || '',
      })
    );
  } catch (e) {
    console.error('[listDashboardOrders]', e);
    const detail =
      e.parent?.message ||
      e.original?.message ||
      e.message ||
      'Error al listar órdenes';
    const expose =
      process.env.NODE_ENV !== 'production' || process.env.EXPOSE_DB_ERRORS === '1';
    return res.status(500).json({
      error: expose ? detail : 'Error al listar órdenes',
    });
  }
}

async function getDashboardOrdersSummary(req, res) {
  try {
    return res.json(
      await posService.getDashboardOrdersSummary({
        venueId: req.venueId,
        eventId: req.query.eventId || null,
        period: req.query.period || 'today',
      })
    );
  } catch (e) {
    return res.status(500).json({ error: 'Error al resumir órdenes' });
  }
}

async function resendOrderEmail(req, res) {
  try {
    return res.json(
      await posService.resendOrderEmail({
        venueId: req.venueId,
        orderId: req.params.orderId,
      })
    );
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.status ? e.message : 'Error al reenviar email' });
  }
}

async function refundDashboardOrder(req, res) {
  try {
    return res.json(
      await posService.refundDashboardOrder({
        venueId: req.venueId,
        orderId: req.params.orderId,
        userId: req.userId,
        userRole: req.user.role,
        reason: req.body?.reason,
      })
    );
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.status ? e.message : 'Error al reembolsar' });
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
  getDashboardOrdersSummary,
  resendOrderEmail,
  refundDashboardOrder,
  createDashboardOrder,
  addDashboardOrderItems,
  closeDashboardOrder,
  ordersByTable,
};
