const adminService = require('../services/admin.service');

async function dashboard(req, res) {
  try {
    return res.json(await adminService.dashboardSummary());
  } catch (e) {
    return res.status(500).json({ error: 'Error al cargar dashboard admin' });
  }
}

async function pendingVenues(req, res) {
  try {
    return res.json(await adminService.listPendingVenues());
  } catch (e) {
    return res.status(500).json({ error: 'Error al listar locales pendientes' });
  }
}

async function users(req, res) {
  try {
    return res.json(await adminService.listUsers());
  } catch (e) {
    return res.status(500).json({ error: 'Error al listar usuarios' });
  }
}

async function updateUserRole(req, res) {
  try {
    return res.json(await adminService.updateUserRole({ userId: req.params.id, role: req.body.role }));
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.status ? e.message : 'Error al actualizar rol' });
  }
}

async function deleteUser(req, res) {
  try {
    return res.json(await adminService.deleteUser({ userId: req.params.id, actorUserId: req.userId }));
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.status ? e.message : 'Error al eliminar usuario' });
  }
}

async function transactions(req, res) {
  try {
    return res.json(await adminService.listTransactions());
  } catch (e) {
    return res.status(500).json({ error: 'Error al listar transacciones' });
  }
}

async function revenueByVenue(req, res) {
  try {
    const { from, to } = req.query;
    return res.json(await adminService.revenueByVenue({ from, to }));
  } catch (e) {
    return res.status(500).json({ error: 'Error al calcular ingresos por local' });
  }
}

module.exports = {
  dashboard,
  pendingVenues,
  users,
  updateUserRole,
  deleteUser,
  transactions,
  revenueByVenue,
};
