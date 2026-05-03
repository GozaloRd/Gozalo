const guestlistService = require('../services/guestlist.service');

async function list(req, res) {
  try {
    const out = await guestlistService.listGuestList({
      venueId: req.venueId,
      eventId: req.params.eventId,
      status: req.query.status,
    });
    return res.json(out);
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || 'Error al listar invitados' });
  }
}

async function create(req, res) {
  try {
    const entry = await guestlistService.createGuestEntry({
      venueId: req.venueId,
      eventId: req.params.eventId,
      userId: req.userId,
      body: req.body || {},
    });
    return res.status(201).json(entry);
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || 'Error al crear invitado' });
  }
}

async function update(req, res) {
  try {
    const entry = await guestlistService.updateGuestEntry({
      venueId: req.venueId,
      eventId: req.params.eventId,
      entryId: req.params.id,
      body: req.body || {},
    });
    return res.json(entry);
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || 'Error al actualizar invitado' });
  }
}

async function remove(req, res) {
  try {
    const out = await guestlistService.deleteGuestEntry({
      venueId: req.venueId,
      eventId: req.params.eventId,
      entryId: req.params.id,
    });
    return res.json(out);
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || 'Error al eliminar invitado' });
  }
}

module.exports = { list, create, update, remove };
