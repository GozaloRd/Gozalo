const forecastService = require('../services/forecast.service');
const { Event } = require('../models');

async function eventForecast(req, res) {
  try {
    const { eventId } = req.params;
    const ev = await Event.findOne({ where: { id: eventId, venueId: req.venueId } });
    if (!ev) return res.status(404).json({ error: 'Evento no encontrado' });
    const result = await forecastService.computeEventForecast({ eventId });
    return res.json(result);
  } catch (e) {
    const status = e.status || 500;
    return res.status(status).json({ error: e.message || 'Error calculando forecast' });
  }
}

module.exports = { eventForecast };
