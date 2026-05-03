const alertsService = require('../services/alerts.service');

async function listAlerts(req, res) {
  try {
    const result = await alertsService.computeVenueAlerts(req.venueId);
    return res.json(result);
  } catch (e) {
    const status = e.status || 500;
    return res.status(status).json({ error: e.message || 'Error calculando alertas' });
  }
}

module.exports = { listAlerts };
