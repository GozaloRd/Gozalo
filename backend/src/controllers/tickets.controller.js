const ticketsService = require('../services/tickets.service');

async function purchaseTickets(req, res) {
  try {
    const result = await ticketsService.purchaseTickets({
      userId: req.userId ?? null,
      body: req.body,
    });
    return res.status(201).json(result);
  } catch (e) {
    const status = e.status || 500;
    return res.status(status).json({ error: e.status ? e.message : 'Error al comprar tickets' });
  }
}

async function listMyTickets(req, res) {
  try {
    return res.json(await ticketsService.listMyTickets(req.userId));
  } catch (e) {
    return res.status(500).json({ error: 'Error al listar tickets' });
  }
}

async function listDashboardTickets(req, res) {
  try {
    return res.json(await ticketsService.listDashboardTickets({ venueId: req.venueId, query: req.query }));
  } catch (e) {
    return res.status(500).json({ error: 'Error al listar tickets' });
  }
}

module.exports = {
  purchaseTickets,
  listMyTickets,
  listDashboardTickets,
};
