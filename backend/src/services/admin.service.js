const { QueryTypes } = require('sequelize');
const { sequelize, User, Venue, Payment, Order, Reservation } = require('../models');

async function dashboardSummary() {
  const [users, venuesPending, venuesApproved, paymentsSum] = await Promise.all([
    User.count(),
    Venue.count({ where: { status: 'pending' } }),
    Venue.count({ where: { status: 'approved' } }),
    Payment.sum('amount', { where: { status: 'completed' } }),
  ]);
  const commissionSum = await Payment.sum('commissionAmount', { where: { status: 'completed' } });
  return {
    totalUsers: users,
    venuesPending,
    venuesApproved,
    totalVolumeRD: paymentsSum || 0,
    platformCommissionsRD: commissionSum || 0,
  };
}

async function listPendingVenues() {
  return Venue.findAll({
    where: { status: 'pending' },
    include: [{ model: User, as: 'owner', attributes: ['id', 'email', 'fullName', 'phone'] }],
  });
}

async function listUsers() {
  return User.findAll({
    attributes: ['id', 'email', 'fullName', 'phone', 'role', 'points', 'createdAt'],
    order: [['createdAt', 'DESC']],
    limit: 500,
  });
}

async function updateUserRole({ userId, role }) {
  const u = await User.findByPk(userId);
  if (!u) {
    const err = new Error('No encontrado');
    err.status = 404;
    throw err;
  }
  u.role = role;
  await u.save();
  return u;
}

async function deleteUser({ userId, actorUserId }) {
  if (!userId) {
    const err = new Error('ID requerido');
    err.status = 400;
    throw err;
  }
  if (userId === actorUserId) {
    const err = new Error('No puedes eliminar tu propia cuenta');
    err.status = 400;
    throw err;
  }

  const u = await User.findByPk(userId);
  if (!u) {
    const err = new Error('No encontrado');
    err.status = 404;
    throw err;
  }

  if (u.role === 'admin') {
    const adminsCount = await User.count({ where: { role: 'admin' } });
    if (adminsCount <= 1) {
      const err = new Error('No puedes eliminar el último admin de la plataforma');
      err.status = 400;
      throw err;
    }
  }

  try {
    await u.destroy();
    return { ok: true };
  } catch (e) {
    const err = new Error(
      'No se puede eliminar esta cuenta porque tiene datos asociados (reservas, tickets, pagos u otros registros).'
    );
    err.status = 409;
    throw err;
  }
}

async function listTransactions() {
  return Payment.findAll({
    where: { status: 'completed' },
    include: [
      { model: Order, as: 'order', required: false },
      { model: Reservation, as: 'reservation', required: false },
    ],
    order: [['createdAt', 'DESC']],
    limit: 200,
  });
}

async function revenueByVenue({ from, to } = {}) {
  const filters = [];
  const replacements = {};

  if (from) {
    filters.push('p.created_at >= :from');
    replacements.from = from;
  }
  if (to) {
    filters.push('p.created_at <= :to');
    replacements.to = to;
  }

  const whereTime = filters.length ? `AND ${filters.join(' AND ')}` : '';

  const rows = await sequelize.query(
    `
      SELECT
        v.id AS "venueId",
        v.name AS "venueName",
        v.city AS "venueCity",
        COALESCE(SUM(CASE WHEN p.reservation_id IS NOT NULL THEN p.amount ELSE 0 END), 0)::decimal AS "reservationsGross",
        COALESCE(SUM(CASE WHEN p.reservation_id IS NOT NULL THEN p.commission_amount ELSE 0 END), 0)::decimal AS "reservationsCommission",
        COALESCE(SUM(CASE WHEN o.id IS NOT NULL AND o.type = 'tickets' THEN p.amount ELSE 0 END), 0)::decimal AS "ticketsGross",
        COALESCE(SUM(CASE WHEN o.id IS NOT NULL AND o.type = 'tickets' THEN p.commission_amount ELSE 0 END), 0)::decimal AS "ticketsCommission",
        COALESCE(SUM(
          CASE
            WHEN p.reservation_id IS NOT NULL THEN p.amount
            WHEN o.id IS NOT NULL AND o.type = 'tickets' THEN p.amount
            ELSE 0
          END
        ), 0)::decimal AS "totalControlledGross",
        COALESCE(SUM(
          CASE
            WHEN p.reservation_id IS NOT NULL THEN p.commission_amount
            WHEN o.id IS NOT NULL AND o.type = 'tickets' THEN p.commission_amount
            ELSE 0
          END
        ), 0)::decimal AS "totalControlledCommission"
      FROM payments p
      LEFT JOIN orders o ON p.order_id = o.id
      LEFT JOIN reservations r ON p.reservation_id = r.id
      LEFT JOIN events e_res ON r.event_id = e_res.id
      LEFT JOIN venues v ON v.id = COALESCE(o.venue_id, e_res.venue_id)
      WHERE p.status = 'completed'
      ${whereTime}
      GROUP BY v.id, v.name, v.city
      HAVING COALESCE(SUM(
        CASE
          WHEN p.reservation_id IS NOT NULL THEN p.amount
          WHEN o.id IS NOT NULL AND o.type = 'tickets' THEN p.amount
          ELSE 0
        END
      ), 0) > 0
      ORDER BY "totalControlledGross" DESC
    `,
    { replacements, type: QueryTypes.SELECT }
  );

  const normalized = rows.map((row) => ({
    venueId: row.venueId,
    venueName: row.venueName || 'Sin local',
    venueCity: row.venueCity || null,
    reservationsGross: Number(row.reservationsGross || 0),
    reservationsCommission: Number(row.reservationsCommission || 0),
    ticketsGross: Number(row.ticketsGross || 0),
    ticketsCommission: Number(row.ticketsCommission || 0),
    totalControlledGross: Number(row.totalControlledGross || 0),
    totalControlledCommission: Number(row.totalControlledCommission || 0),
  }));

  const totals = normalized.reduce(
    (acc, row) => ({
      reservationsGross: acc.reservationsGross + row.reservationsGross,
      reservationsCommission: acc.reservationsCommission + row.reservationsCommission,
      ticketsGross: acc.ticketsGross + row.ticketsGross,
      ticketsCommission: acc.ticketsCommission + row.ticketsCommission,
      totalControlledGross: acc.totalControlledGross + row.totalControlledGross,
      totalControlledCommission: acc.totalControlledCommission + row.totalControlledCommission,
    }),
    {
      reservationsGross: 0,
      reservationsCommission: 0,
      ticketsGross: 0,
      ticketsCommission: 0,
      totalControlledGross: 0,
      totalControlledCommission: 0,
    }
  );

  return { rows: normalized, totals };
}

module.exports = {
  dashboardSummary,
  listPendingVenues,
  listUsers,
  updateUserRole,
  deleteUser,
  listTransactions,
  revenueByVenue,
};
