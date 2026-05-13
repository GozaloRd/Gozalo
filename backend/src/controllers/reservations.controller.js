const reservationsService = require('../services/reservations.service');

async function createReservation(req, res) {
  try {
    const result = await reservationsService.createReservation({
      user: req.user ?? null,
      userId: req.userId ?? null,
      body: req.body,
    });
    return res.status(201).json(result);
  } catch (e) {
    const status = e.status || 500;
    return res.status(status).json({ error: e.status ? e.message : 'Error al crear reserva' });
  }
}

async function listMyReservations(req, res) {
  try {
    return res.json(await reservationsService.listMyReservations(req.userId));
  } catch (e) {
    return res.status(500).json({ error: 'Error al listar reservas' });
  }
}

async function listReservationsByVenue(req, res) {
  try {
    return res.json(
      await reservationsService.listReservationsByVenue({
        venueId: req.params.venueId,
        userId: req.userId,
        userRole: req.user.role,
      })
    );
  } catch (e) {
    const status = e.status || 500;
    return res.status(status).json({ error: e.status ? e.message : 'Error al listar reservas del local' });
  }
}

async function updateReservationStatus(req, res) {
  try {
    return res.json(
      await reservationsService.updateReservationStatus({
        reservationId: req.params.id,
        status: req.body.status,
        userId: req.userId,
        userRole: req.user.role,
      })
    );
  } catch (e) {
    const status = e.status || 500;
    return res.status(status).json({ error: e.status ? e.message : 'Error al actualizar estado' });
  }
}

async function confirmReservationPayment(req, res) {
  try {
    return res.json(
      await reservationsService.confirmReservationPayment({
        reservationId: req.params.id,
        userId: req.userId,
      })
    );
  } catch (e) {
    const status = e.status || 500;
    return res.status(status).json({ error: e.status ? e.message : 'Error al confirmar pago' });
  }
}

async function cancelMyReservation(req, res) {
  try {
    return res.json(
      await reservationsService.cancelMyReservation({
        reservationId: req.params.id,
        userId: req.userId,
      })
    );
  } catch (e) {
    const status = e.status || 500;
    return res.status(status).json({ error: e.status ? e.message : 'Error al cancelar reserva' });
  }
}

async function listDashboardReservations(req, res) {
  try {
    return res.json(
      await reservationsService.listDashboardReservations({
        venueId: req.venueId,
        query: req.query,
      })
    );
  } catch (e) {
    return res.status(500).json({ error: 'Error al listar reservas' });
  }
}

module.exports = {
  createReservation,
  listMyReservations,
  listReservationsByVenue,
  updateReservationStatus,
  confirmReservationPayment,
  cancelMyReservation,
  listDashboardReservations,
};
