const accessService = require('../services/access.service');

async function scan(req, res) {
  try {
    const result = await accessService.scanAccess({
      payload: req.body.payload,
      eventId: req.body.eventId,
      userId: req.userId,
      userRole: req.user.role,
    });
    return res.json(result);
  } catch (e) {
    const status = e.status || 500;
    if (e.payload) return res.status(status).json(e.payload);
    return res.status(status).json({ error: e.status ? e.message : 'Error al escanear' });
  }
}

async function occupancy(req, res) {
  try {
    const result = await accessService.getOccupancy({
      eventId: req.params.eventId,
      userId: req.userId,
      userRole: req.user.role,
    });
    return res.json(result);
  } catch (e) {
    const status = e.status || 500;
    return res.status(status).json({ error: e.status ? e.message : 'Error al obtener ocupación' });
  }
}

module.exports = {
  scan,
  occupancy,
};
