const waitlistService = require('../services/waitlist.service');

async function join(req, res) {
  try {
    const out = await waitlistService.joinWaitlist({
      userId: req.userId,
      eventId: req.params.eventId,
      body: req.body || {},
    });
    return res.status(201).json(out);
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || 'Error al unirse a la lista' });
  }
}

async function leave(req, res) {
  try {
    const out = await waitlistService.leaveWaitlist({
      userId: req.userId,
      eventId: req.params.eventId,
    });
    return res.json(out);
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || 'Error al salir de la lista' });
  }
}

async function mine(req, res) {
  try {
    const out = await waitlistService.getMyEntry({
      userId: req.userId,
      eventId: req.params.eventId,
    });
    return res.json(out);
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || 'Error al consultar lista' });
  }
}

async function listForEvent(req, res) {
  try {
    const rows = await waitlistService.listEventWaitlist({
      eventId: req.params.eventId,
      status: req.query.status,
    });
    return res.json({ data: rows });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || 'Error al listar lista' });
  }
}

async function notifyNext(req, res) {
  try {
    const out = await waitlistService.notifyNext({
      eventId: req.params.eventId,
      count: parseInt(req.body?.count, 10) || 1,
    });
    return res.json({ notified: out.length, entries: out });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || 'Error al notificar' });
  }
}

module.exports = { join, leave, mine, listForEvent, notifyNext };
