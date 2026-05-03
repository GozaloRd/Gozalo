const recurrenceService = require('../services/recurrence.service');

async function createWeekly(req, res) {
  try {
    const { sourceEventId, weeks, copyTickets, publish } = req.body;
    const result = await recurrenceService.createWeeklyRecurrence({
      sourceEventId,
      weeks,
      copyTickets,
      publish,
      venueId: req.venueId,
    });
    return res.status(201).json(result);
  } catch (e) {
    const status = e.status || 500;
    return res.status(status).json({ error: e.message || 'Error creando serie recurrente' });
  }
}

async function list(req, res) {
  try {
    const items = await recurrenceService.listVenueRecurrences(req.venueId);
    return res.json({ data: items });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Error listando series' });
  }
}

module.exports = { createWeekly, list };
