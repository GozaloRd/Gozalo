const { Op } = require('sequelize');
const { Reservation, Event, VenueTable, Venue, User, Payment } = require('../models');
const { createPayload, generateQrPng } = require('./qrService');
const { sendReservationConfirmation } = require('./emailService');
const { findOrCreateCustomerByEmail } = require('./guestUser.service');
const {
  normalizeReservationStatus,
} = require('../controllers/dashboardHelpers');

function toPage({ page, pageSize }) {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const size = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
  return { page: p, pageSize: size, offset: (p - 1) * size };
}

/** Desglose para panel Ventas (contrato, cobro cliente, ingreso local). */
function reservationPaymentSplit(row) {
  const fallbackPaid = Number(row.totalAmount || 0);
  if (!row.notes) {
    return {
      totalContratoRD: null,
      pagadoEnLineaRD: null,
      saldoPendienteRD: null,
      payNowLocalBaseRD: null,
      payNowCustomerRD: null,
    };
  }
  try {
    const parsed = JSON.parse(row.notes);
    const p = parsed?.payment;
    if (!p || typeof p !== 'object') {
      return {
        totalContratoRD: null,
        pagadoEnLineaRD: null,
        saldoPendienteRD: null,
        payNowLocalBaseRD: null,
        payNowCustomerRD: null,
      };
    }
    const v2 = p.paymentVersion >= 2 || p.payNowLocalBase != null;
    const totalCustomer = Number(p.totalCustomerContract ?? p.total);
    const payNowCustomer = Number(p.payNowCustomer ?? p.payNow);
    const payNowLocal = Number(p.payNowLocalBase ?? NaN);
    const pendingLocal = Number(p.pendingLocalBase ?? p.pendingAtVenue);

    if (v2 && Number.isFinite(totalCustomer) && totalCustomer > 0) {
      const subLoc = Number(p.subtotalLocal ?? p.totalLocalContract ?? 0);
      const localBaseOk =
        Number.isFinite(payNowLocal) && payNowLocal >= 0
          ? payNowLocal
          : Number((payNowCustomer).toFixed(2));
      let saldoOk;
      if (Number.isFinite(pendingLocal) && pendingLocal >= 0) saldoOk = pendingLocal;
      else saldoOk = Math.max(0, Number((subLoc - localBaseOk).toFixed(2)));
      return {
        totalContratoRD: Number.isFinite(subLoc) && subLoc > 0 ? subLoc : totalCustomer,
        pagadoEnLineaRD: localBaseOk,
        saldoPendienteRD: saldoOk,
        payNowLocalBaseRD: localBaseOk,
        payNowCustomerRD: Number.isFinite(payNowCustomer) ? payNowCustomer : fallbackPaid,
      };
    }

    const total = Number(p.total);
    const payNow = Number(p.payNow);
    const pendingAtVenue = Number(p.pendingAtVenue);
    if (!(Number.isFinite(total) && total > 0)) {
      return {
        totalContratoRD: null,
        pagadoEnLineaRD: null,
        saldoPendienteRD: null,
        payNowLocalBaseRD: null,
        payNowCustomerRD: null,
      };
    }
    const legacyTableAmount = Number(p.table?.amount ?? 0);
    const legacyCoverAmount = Number(p.cover?.amount ?? 0);
    const legacyLocalTotal = legacyTableAmount + legacyCoverAmount;
    const legacyPct = Number(p.upfrontPercent);
    if (legacyLocalTotal > 0 && Number.isFinite(legacyPct) && legacyPct > 0) {
      const localPaid = Number(((legacyLocalTotal * legacyPct) / 100).toFixed(2));
      const localPending = Math.max(0, Number((legacyLocalTotal - localPaid).toFixed(2)));
      return {
        totalContratoRD: legacyLocalTotal,
        pagadoEnLineaRD: localPaid,
        saldoPendienteRD: localPending,
        payNowLocalBaseRD: localPaid,
        payNowCustomerRD: Number.isFinite(payNow) ? payNow : fallbackPaid,
      };
    }

    const paidOk = Number.isFinite(payNow) && payNow >= 0 ? payNow : fallbackPaid;
    let saldoOk;
    if (Number.isFinite(pendingAtVenue) && pendingAtVenue >= 0) saldoOk = pendingAtVenue;
    else saldoOk = Math.max(0, Number((total - paidOk).toFixed(2)));
    return {
      totalContratoRD: total,
      pagadoEnLineaRD: paidOk,
      saldoPendienteRD: saldoOk,
      payNowLocalBaseRD: paidOk,
      payNowCustomerRD: paidOk,
    };
  } catch {
    return {
      totalContratoRD: null,
      pagadoEnLineaRD: null,
      saldoPendienteRD: null,
      payNowLocalBaseRD: null,
      payNowCustomerRD: null,
    };
  }
}

async function createReservation({ user, userId, body }) {
  const event = await Event.findByPk(body.eventId, { include: [{ model: Venue, as: 'venue' }] });
  if (!event || event.status !== 'published') {
    const err = new Error('Evento no disponible');
    err.status = 400;
    throw err;
  }

  const table = await VenueTable.findByPk(body.tableId);
  if (!table || table.venueId !== event.venueId) {
    const err = new Error('Mesa inválida');
    err.status = 400;
    throw err;
  }
  if (table.eventId && table.eventId !== event.id) {
    const err = new Error('Mesa no asignada a este evento');
    err.status = 400;
    throw err;
  }

  const alreadyTaken = await Reservation.findOne({
    where: {
      eventId: event.id,
      tableId: table.id,
      status: { [Op.in]: ['pending', 'confirmed', 'checked_in', 'completed'] },
    },
  });
  if (alreadyTaken) {
    const err = new Error('La mesa seleccionada ya no está disponible');
    err.status = 409;
    throw err;
  }

  const tableAmount = Number(table.minPrice || body.minDeposit || 500);
  const cover = body.cover || {};
  const coverQuantity = Number(cover.quantity || 0);
  const coverUnitPrice = Number(cover.unitPrice || 0);
  const coverAmount = coverQuantity > 0 ? coverQuantity * coverUnitPrice : 0;

  /** Importe contrato (mesa + cover); cliente paga el mismo monto (sin recargos). */
  const subtotalLocal = Number((tableAmount + coverAmount).toFixed(2));
  const totalCustomerContract = subtotalLocal;

  const configured = Number(table.initialPaymentPercent);
  const tablePct =
    Number.isFinite(configured) && configured >= 1 && configured <= 100 ? configured : 50;

  let paymentOption = body.paymentOption === 'partial' ? 'partial' : 'total';
  if (tablePct >= 100) {
    paymentOption = 'total';
  }
  const upfrontPercent = paymentOption === 'partial' ? tablePct : 100;

  const payNowLocalBase = Number(((subtotalLocal * upfrontPercent) / 100).toFixed(2));
  const pendingLocalBase = Number((subtotalLocal - payNowLocalBase).toFixed(2));
  const payNowCustomer = payNowLocalBase;
  const platformCommission = 0;

  const details = {
    paymentVersion: 2,
    table: { id: table.id, zone: table.zone, label: table.label, capacity: table.capacity, amount: tableAmount },
    cover:
      coverQuantity > 0
        ? {
            ticketType: cover.ticketType || 'Cover',
            quantity: coverQuantity,
            unitPrice: coverUnitPrice,
            amount: coverAmount,
          }
        : null,
    subtotalLocal,
    consumerSurchargeRate: 0,
    totalLocalContract: subtotalLocal,
    totalCustomerContract,
    paymentOption,
    upfrontPercent,
    payNowLocalBase,
    payNowCustomer,
    platformCommissionOnPayment: platformCommission,
    pendingLocalBase,
    pendingAtVenue: pendingLocalBase,
    total: totalCustomerContract,
    payNow: payNowCustomer,
  };

  const resolvedUserId = userId || (await findOrCreateCustomerByEmail(body.buyerEmail, body.buyerFullName, 'reservation'));

  const qrPayload = createPayload('res');
  /** POST exitoso = cobro del tramo «payNow» completado (sin pasarela: simulación; con pasarela: tras capture). */
  const reservation = await Reservation.create({
    userId: resolvedUserId,
    eventId: event.id,
    tableId: table.id,
    partySize: body.partySize,
    totalAmount: payNowCustomer,
    status: 'confirmed',
    qrPayload,
    notes: JSON.stringify({
      customerNotes: body.notes || null,
      payment: details,
    }),
  });

  await Payment.create({
    reservationId: reservation.id,
    orderId: null,
    amount: payNowCustomer,
    method: 'other',
    status: 'completed',
    commissionAmount: platformCommission,
    externalRef: 'reserva_web_adelanto',
  }).catch(() => {});

  const qrImage = await generateQrPng(qrPayload);
  const buyer = user || (await User.findByPk(resolvedUserId, { attributes: ['email', 'fullName'] }));
  if (!buyer?.email) {
    const err = new Error('No se pudo determinar el correo del comprador.');
    err.status = 500;
    throw err;
  }
  await sendReservationConfirmation(buyer.email, {
    name: buyer.fullName,
    eventTitle: event.title,
    venueName: event.venue.name,
    status: reservation.status,
    tableLabel: `${table.zone} ${table.label}`,
    partySize: reservation.partySize,
    total: totalCustomerContract,
  }).catch(() => {});
  return { reservation, qrImage, breakdown: details };
}

async function listMyReservations(userId) {
  return Reservation.findAll({
    where: { userId },
    include: [
      { model: Event, as: 'event', include: [{ model: Venue, as: 'venue' }] },
      { model: VenueTable, as: 'table' },
    ],
    order: [['createdAt', 'DESC']],
  });
}

async function listReservationsByVenue({ venueId, userId, userRole }) {
  const venue = await Venue.findByPk(venueId);
  if (!venue) {
    const err = new Error('Local no encontrado');
    err.status = 404;
    throw err;
  }
  if (userRole !== 'admin' && venue.ownerId !== userId) {
    const err = new Error('No autorizado');
    err.status = 403;
    throw err;
  }

  return Reservation.findAll({
    include: [
      {
        model: Event,
        as: 'event',
        where: { venueId: venue.id },
        required: true,
      },
      { model: User, as: 'user', attributes: ['id', 'email', 'fullName', 'phone'] },
      { model: VenueTable, as: 'table' },
    ],
    order: [['createdAt', 'DESC']],
  });
}

async function updateReservationStatus({ reservationId, status, userId, userRole }) {
  const reservation = await Reservation.findByPk(reservationId, {
    include: [{ model: Event, as: 'event', include: [{ model: Venue, as: 'venue' }] }],
  });
  if (!reservation) {
    const err = new Error('No encontrado');
    err.status = 404;
    throw err;
  }
  const venue = reservation.event.venue;
  if (userRole !== 'admin' && venue.ownerId !== userId) {
    const err = new Error('No autorizado');
    err.status = 403;
    throw err;
  }
  reservation.status = status;
  if (status === 'checked_in' && !reservation.checkedInAt) {
    reservation.checkedInAt = new Date();
  }
  await reservation.save();
  return reservation;
}

async function confirmReservationPayment({ reservationId, userId }) {
  const reservation = await Reservation.findByPk(reservationId);
  if (!reservation || reservation.userId !== userId) {
    const err = new Error('No encontrado');
    err.status = 404;
    throw err;
  }
  reservation.status = 'confirmed';
  await reservation.save();
  return reservation;
}

async function cancelMyReservation({ reservationId, userId }) {
  const reservation = await Reservation.findByPk(reservationId);
  if (!reservation || reservation.userId !== userId) {
    const err = new Error('No encontrado');
    err.status = 404;
    throw err;
  }
  if (!['pending', 'confirmed'].includes(reservation.status)) {
    const err = new Error('Solo se pueden cancelar reservas pendientes o confirmadas');
    err.status = 400;
    throw err;
  }
  reservation.status = 'cancelled';
  await reservation.save();
  return { ok: true, reservation };
}

async function listDashboardReservations({ venueId, query }) {
  const { page, pageSize, offset } = toPage(query);
  const eventId = query.eventId || null;
  const statusRaw = normalizeReservationStatus(query.status);
  const from = query.from ? new Date(query.from) : null;
  const to = query.to ? new Date(query.to) : null;
  const sort = query.sort === 'asc' ? 'ASC' : 'DESC';

  const where = {};
  if (statusRaw) where.status = statusRaw;
  if (from && to) where.createdAt = { [Op.between]: [from, to] };
  else if (from) where.createdAt = { [Op.gte]: from };
  else if (to) where.createdAt = { [Op.lte]: to };

  const eventWhere = { venueId };
  if (eventId) eventWhere.id = eventId;

  const { rows, count } = await Reservation.findAndCountAll({
    where,
    include: [
      { model: User, as: 'user', attributes: ['id', 'fullName', 'email', 'phone'] },
      {
        model: Event,
        as: 'event',
        where: eventWhere,
        required: true,
        attributes: ['id', 'title', 'startAt', 'venueId'],
      },
      { model: VenueTable, as: 'table', attributes: ['id', 'zone', 'label'] },
    ],
    order: [['createdAt', sort]],
    limit: pageSize,
    offset,
  });

  /** Reservas antiguas o inconsistentes: pending en BD pero con pago online completado → confirmada. */
  const pendingIds = rows.filter((r) => r.status === 'pending').map((r) => r.id);
  if (pendingIds.length) {
    const paidRows = await Payment.findAll({
      attributes: ['reservationId'],
      where: {
        reservationId: { [Op.in]: pendingIds },
        status: 'completed',
      },
      raw: true,
    });
    const paidIds = [...new Set(paidRows.map((p) => p.reservationId).filter(Boolean))];
    if (paidIds.length) {
      await Reservation.update(
        { status: 'confirmed' },
        { where: { id: { [Op.in]: paidIds }, status: 'pending' } }
      );
      const paidSet = new Set(paidIds);
      for (const r of rows) {
        if (r.status === 'pending' && paidSet.has(r.id)) {
          r.set('status', 'confirmed');
        }
      }
    }
  }

  const data = rows.map((row) => {
    const split = reservationPaymentSplit(row);
    const ingresoBaseLocalRD =
      split.payNowLocalBaseRD != null && Number.isFinite(Number(split.payNowLocalBaseRD))
        ? Number(Number(split.payNowLocalBaseRD).toFixed(2))
        : Number(Number(row.totalAmount || 0).toFixed(2));
    const ingresoNetoLocalRD = ingresoBaseLocalRD;
    return {
      id: row.id,
      cliente: {
        nombre: row.user?.fullName,
        email: row.user?.email,
        telefono: row.user?.phone,
      },
      evento: row.event ? { id: row.event.id, titulo: row.event.title, fecha: row.event.startAt } : null,
      mesa: row.table ? `${row.table.zone} ${row.table.label}` : null,
      tableId: row.table ? row.table.id : null,
      partySize: row.partySize,
      montoRD: ingresoBaseLocalRD,
      totalContratoRD: split.totalContratoRD,
      pagadoEnLineaRD: split.pagadoEnLineaRD,
      saldoPendienteRD: split.saldoPendienteRD,
      ingresoNetoLocalRD,
      estado: row.status,
      horaCheckIn: row.checkedInAt,
      creadoEn: row.createdAt,
      notes: row.notes || null,
    };
  });

  return {
    data,
    pagination: { page, pageSize, total: count, totalPages: Math.ceil(count / pageSize) },
  };
}

module.exports = {
  createReservation,
  listMyReservations,
  listReservationsByVenue,
  updateReservationStatus,
  confirmReservationPayment,
  cancelMyReservation,
  listDashboardReservations,
  reservationPaymentSplit,
};
