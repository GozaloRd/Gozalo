const dashboardController = require('../controllers/dashboard.controller');
const venuesService = require('../services/venues.service');

async function getMineVenue(req, res) {
  // Mantiene exactamente la funcionalidad actual delegando en el controlador existente.
  return dashboardController.getMineVenue(req, res);
}

async function listMineVenues(req, res) {
  try {
    const venues = await venuesService.listMineVenues({
      userRole: req.user.role,
      userId: req.userId,
    });
    return res.json(venues);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.status ? error.message : 'Error al listar locales' });
  }
}

async function listVenues(req, res) {
  try {
    const venues = await venuesService.listVenues({
      city: req.query.city,
      status: req.query.status,
    });
    return res.json(venues);
  } catch (error) {
    return res.status(500).json({ error: 'Error al listar locales' });
  }
}

async function getVenueTables(req, res) {
  try {
    const tables = await venuesService.getVenueTables(req.params.id);
    return res.json(tables);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.status ? error.message : 'Error al listar mesas' });
  }
}

async function createVenueTable(req, res) {
  try {
    const table = await venuesService.createVenueTable({
      venueId: req.params.id,
      userRole: req.user.role,
      userId: req.userId,
      body: req.body,
    });
    return res.status(201).json(table);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.status ? error.message : 'Error al crear mesa' });
  }
}

async function updateVenueTable(req, res) {
  try {
    const table = await venuesService.updateVenueTable({
      venueId: req.params.venueId,
      tableId: req.params.tableId,
      userRole: req.user.role,
      userId: req.userId,
      body: req.body,
    });
    return res.json(table);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.status ? error.message : 'Error al actualizar mesa' });
  }
}

async function getVenueById(req, res) {
  try {
    const venue = await venuesService.getVenueById(req.params.id);
    return res.json(venue);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.status ? error.message : 'Error al obtener local' });
  }
}

async function createVenue(req, res) {
  try {
    const venue = await venuesService.createVenue({
      userRole: req.user.role,
      userId: req.userId,
      body: req.body,
    });
    return res.status(201).json(venue);
  } catch (error) {
    return res.status(500).json({ error: 'Error al crear local' });
  }
}

async function updateVenue(req, res) {
  try {
    const venue = await venuesService.updateVenue({
      venueId: req.params.id,
      userRole: req.user.role,
      userId: req.userId,
      body: req.body,
    });
    return res.json(venue);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.status ? error.message : 'Error al actualizar local' });
  }
}

async function updateVenueStatus(req, res) {
  try {
    const venue = await venuesService.updateVenueStatus({
      venueId: req.params.id,
      status: req.body.status,
    });
    return res.json(venue);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.status ? error.message : 'Error al actualizar estado del local' });
  }
}

module.exports = {
  getMineVenue,
  listMineVenues,
  listVenues,
  getVenueTables,
  createVenueTable,
  updateVenueTable,
  getVenueById,
  createVenue,
  updateVenue,
  updateVenueStatus,
};
