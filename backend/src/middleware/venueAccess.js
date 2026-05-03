const { Venue, VenueStaff } = require('../models');

function isMutatingMethod(method) {
  return method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
}

function ensureVenueOperational(req, res, venue) {
  if (!isMutatingMethod(req.method)) return true;
  if (venue.status === 'approved') return true;
  let error =
    'Tu local aún no está aprobado por administración. Puedes verlo, pero no crear ni modificar eventos, mesas, reservas o caja hasta aprobación.';
  if (venue.status === 'pending') {
    error =
      'Estas pendiente de aprobacion por un administrador de Gozalo. Hasta que te aprueben, no puedes crear ni modificar eventos, mesas, reservas o caja.';
  } else if (venue.status === 'rejected') {
    error =
      'Tu local ha sido desaprobado. No puedes crear ni modificar eventos, mesas, reservas o caja hasta que un administrador lo apruebe.';
  } else if (venue.status === 'suspended') {
    error =
      'Tu local esta suspendido por administracion. No puedes crear ni modificar eventos, mesas, reservas o caja.';
  }
  return res.status(403).json({
    error,
  });
}

/**
 * Tras authenticate. Resuelve req.venue y req.venueId.
 * - venue_owner: usa query/body venueId o el primer local del dueño
 * - admin: requiere venueId
 * - staff: requiere venueId y membresía activa en venue_staff
 */
async function requireVenueAccess(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const venueId =
      req.query.venueId || req.body.venueId || req.params.venueId || null;

    if (req.user.role === 'admin') {
      if (!venueId) {
        return res.status(400).json({ error: 'venueId es requerido para administradores' });
      }
      const venue = await Venue.findByPk(venueId);
      if (!venue) return res.status(404).json({ error: 'Local no encontrado' });
      req.venue = venue;
      req.venueId = venue.id;
      return next();
    }

    if (req.user.role === 'venue_owner') {
      const where = venueId ? { id: venueId, ownerId: req.userId } : { ownerId: req.userId };
      const venue = await Venue.findOne({
        where,
        order: [['createdAt', 'ASC']],
      });
      if (!venue) {
        return res.status(404).json({ error: 'Local no encontrado o sin permiso' });
      }
      req.venue = venue;
      req.venueId = venue.id;
      if (!ensureVenueOperational(req, res, venue)) return;
      return next();
    }

    if (req.user.role === 'staff') {
      if (!venueId) {
        return res.status(400).json({ error: 'venueId es requerido para personal' });
      }
      const vs = await VenueStaff.findOne({
        where: { venueId, userId: req.userId, active: true },
        include: [{ model: Venue, as: 'venue' }],
      });
      if (!vs || !vs.venue) {
        return res.status(403).json({ error: 'Sin acceso a este local' });
      }
      req.venue = vs.venue;
      req.venueId = vs.venue.id;
      req.staffRole = vs.staffRole;
      if (!ensureVenueOperational(req, res, vs.venue)) return;
      return next();
    }

    return res.status(403).json({ error: 'Rol no autorizado para el panel del local' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error al validar acceso al local' });
  }
}

module.exports = { requireVenueAccess };
