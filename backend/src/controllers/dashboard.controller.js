const dashboardService = require('../services/dashboard.service');

async function getMineVenue(req, res) {
  try {
    return res.json(await dashboardService.getMineVenue({ user: req.user, userId: req.userId, query: req.query }));
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.status ? e.message : 'Error al obtener el local' });
  }
}

async function getStats(req, res) {
  try {
    return res.json(await dashboardService.getStats({ venueId: req.venueId, venue: req.venue }));
  } catch (e) {
    return res.status(500).json({ error: 'Error al calcular estadísticas' });
  }
}

async function listDashboardTables(req, res) {
  try {
    return res.json(await dashboardService.listDashboardTables({ venueId: req.venueId, query: req.query }));
  } catch (e) {
    return res.status(500).json({ error: 'Error al listar mesas' });
  }
}

async function createDashboardTable(req, res) {
  try {
    return res.status(201).json(await dashboardService.createDashboardTable({ venueId: req.venueId, body: req.body }));
  } catch (e) {
    return res.status(500).json({ error: 'Error al crear mesa' });
  }
}

async function updateDashboardTable(req, res) {
  try {
    return res.json(
      await dashboardService.updateDashboardTable({ venueId: req.venueId, tableId: req.params.id, body: req.body })
    );
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.status ? e.message : 'Error al actualizar mesa' });
  }
}

async function deactivateDashboardTable(req, res) {
  try {
    return res.json(await dashboardService.deactivateDashboardTable({ venueId: req.venueId, tableId: req.params.id }));
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.status ? e.message : 'Error al desactivar mesa' });
  }
}

async function listStaff(req, res) {
  try {
    return res.json(await dashboardService.listStaff({ venueId: req.venueId }));
  } catch (e) {
    return res.status(500).json({ error: 'Error al listar personal' });
  }
}

async function addStaff(req, res) {
  try {
    const data = await dashboardService.addStaff({ venueId: req.venueId, body: req.body });
    return res.status(201).json(data);
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.status ? e.message : 'Error al agregar personal' });
  }
}

async function removeStaff(req, res) {
  try {
    return res.json(await dashboardService.removeStaff({ venueId: req.venueId, staffId: req.params.id }));
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.status ? e.message : 'Error al eliminar personal' });
  }
}

async function staffSales(req, res) {
  try {
    return res.json(await dashboardService.staffSales({ venueId: req.venueId, query: req.query }));
  } catch (e) {
    return res.status(500).json({ error: 'Error al calcular ventas por camarero' });
  }
}

async function getReports(req, res) {
  try {
    return res.json(await dashboardService.getReports({ venueId: req.venueId }));
  } catch (e) {
    return res.status(500).json({ error: 'Error al generar reportes' });
  }
}

async function getAnalytics(req, res) {
  try {
    return res.json(await dashboardService.getAnalytics({ venueId: req.venueId, venue: req.venue, query: req.query }));
  } catch (e) {
    return res.status(500).json({ error: 'Error al obtener analiticas' });
  }
}

async function getSalesPanelMetrics(req, res) {
  try {
    return res.json(await dashboardService.getSalesPanelMetrics({ venueId: req.venueId }));
  } catch (e) {
    return res.status(500).json({ error: 'Error al calcular ventas' });
  }
}

async function listCashClosings(req, res) {
  try {
    return res.json(await dashboardService.listCashClosings({ venueId: req.venueId }));
  } catch (e) {
    return res.status(500).json({ error: 'Error al listar cierres' });
  }
}

async function createCashClosing(req, res) {
  try {
    return res.status(201).json(
      await dashboardService.createCashClosing({ venueId: req.venueId, userId: req.userId, body: req.body })
    );
  } catch (e) {
    return res.status(500).json({ error: 'Error al registrar cierre de caja' });
  }
}

async function deleteCashClosing(req, res) {
  try {
    const r = await dashboardService.deleteCashClosing({
      venueId: req.venueId,
      closingId: req.params.id,
    });
    if (!r.deleted) return res.status(404).json({ error: 'Reporte no encontrado' });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: 'Error al eliminar reporte' });
  }
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
