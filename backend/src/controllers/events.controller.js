const eventsService = require('../services/events.service');

async function listPublicEvents(req, res) {
  try {
    return res.json(await eventsService.listPublicEvents(req.query));
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error al listar eventos' });
  }
}

async function getPublicEventById(req, res) {
  try {
    return res.json(await eventsService.getPublicEventById(req.params.id));
  } catch (e) {
    console.error(e);
    return res.status(e.status || 500).json({ error: e.status ? e.message : 'Error al cargar evento' });
  }
}

async function getPublicEventBySlug(req, res) {
  try {
    return res.json(await eventsService.getPublicEventBySlug(req.params.slug));
  } catch (e) {
    console.error(e);
    return res.status(e.status || 500).json({ error: e.status ? e.message : 'Error al cargar evento' });
  }
}

async function getPublicEventTables(req, res) {
  try {
    return res.json(await eventsService.getPublicEventTables(req.params.id));
  } catch (e) {
    console.error(e);
    return res.status(e.status || 500).json({ error: e.status ? e.message : 'Error al listar mesas' });
  }
}

async function createPublicEvent(req, res) {
  try {
    const event = await eventsService.createPublicEvent({
      body: req.body,
      userId: req.userId,
      userRole: req.user.role,
    });
    return res.status(201).json(event);
  } catch (e) {
    console.error(e);
    return res.status(e.status || 500).json({ error: e.status ? e.message : 'Error al crear evento' });
  }
}

async function updatePublicEvent(req, res) {
  try {
    const event = await eventsService.updatePublicEvent({
      eventId: req.params.id,
      body: req.body,
      userId: req.userId,
      userRole: req.user.role,
    });
    return res.json(event);
  } catch (e) {
    console.error(e);
    return res.status(e.status || 500).json({ error: e.status ? e.message : 'Error al actualizar evento' });
  }
}

async function listDashboardEvents(req, res) {
  try {
    return res.json(await eventsService.listDashboardEvents({ venueId: req.venueId, scope: req.query.scope || 'all' }));
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error al listar eventos' });
  }
}

async function createDashboardEvent(req, res) {
  try {
    return res.status(201).json(await eventsService.createDashboardEvent({ venueId: req.venueId, body: req.body }));
  } catch (e) {
    console.error(e);
    return res.status(e.status || 500).json({ error: e.status ? e.message : 'Error al crear evento' });
  }
}

async function updateDashboardEvent(req, res) {
  try {
    return res.json(await eventsService.updateDashboardEvent({ venueId: req.venueId, eventId: req.params.id, body: req.body }));
  } catch (e) {
    console.error(e);
    return res.status(e.status || 500).json({ error: e.status ? e.message : 'Error al actualizar evento' });
  }
}

async function updateEventCollage(req, res) {
  try {
    const photos = Array.isArray(req.body?.photos) ? req.body.photos : [];
    return res.json(
      await eventsService.updateEventCollage({
        venueId: req.venueId,
        eventId: req.params.id,
        photos,
      })
    );
  } catch (e) {
    console.error(e);
    return res
      .status(e.status || 500)
      .json({ error: e.status ? e.message : 'Error al actualizar collage' });
  }
}

async function cancelDashboardEvent(req, res) {
  try {
    return res.json(await eventsService.cancelDashboardEvent({ venueId: req.venueId, eventId: req.params.id }));
  } catch (e) {
    console.error(e);
    return res.status(e.status || 500).json({ error: e.status ? e.message : 'Error al cancelar evento' });
  }
}

module.exports = {
  listPublicEvents,
  getPublicEventById,
  getPublicEventBySlug,
  getPublicEventTables,
  createPublicEvent,
  updatePublicEvent,
  listDashboardEvents,
  createDashboardEvent,
  updateDashboardEvent,
  updateEventCollage,
  cancelDashboardEvent,
};
