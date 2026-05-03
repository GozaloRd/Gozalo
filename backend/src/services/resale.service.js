const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const { Ticket, TicketResale, Event, User } = require('../models');

/**
 * Fees aplicados en reventa:
 *   BUYER_FEE  – el comprador paga el precio original + 10 %
 *   SELLER_FEE – al vendedor se le descuenta un 10 % de comisión
 *
 * Ejemplo con ticket de 1.000 DOP:
 *   finalPrice   = 1.100  (paga el comprador)
 *   sellerPayout =   900  (recibe el vendedor)
 *   platformNet  =   200  (ingresa Gozalo)
 *
 * El precio de reventa queda BLOQUEADO al precio original del ticket.
 * El vendedor NO puede alterarlo ni para arriba ni para abajo.
 */
const BUYER_FEE  = 0.10;
const SELLER_FEE = 0.10;

/** Lista los tickets de reventa activos de un evento (para el mercado público). */
async function listEventResales(eventId) {
  return TicketResale.findAll({
    where: { eventId, status: 'listed' },
    include: [
      { model: Ticket, as: 'ticket', attributes: ['id', 'ticketType', 'unitPrice'] },
      { model: User,   as: 'seller', attributes: ['id', 'fullName'] },
    ],
    order: [['listedAt', 'ASC']],
  });
}

/** Lista las reventas del propio usuario como vendedor. */
async function myListings(sellerUserId) {
  return TicketResale.findAll({
    where: { sellerUserId },
    include: [
      { model: Ticket, as: 'ticket', attributes: ['id', 'ticketType', 'unitPrice', 'status'] },
      { model: Event,  as: 'event',  attributes: ['id', 'title', 'startAt'] },
    ],
    order: [['listedAt', 'DESC']],
  });
}

/** Lista las compras de reventa del propio usuario como comprador. */
async function myPurchases(buyerUserId) {
  return TicketResale.findAll({
    where: { buyerUserId, status: { [Op.in]: ['claimed', 'completed'] } },
    include: [
      { model: Ticket, as: 'ticket', attributes: ['id', 'ticketType', 'qrPayload'] },
      { model: Event,  as: 'event',  attributes: ['id', 'title', 'startAt'] },
    ],
    order: [['claimedAt', 'DESC']],
  });
}

/**
 * Publica una entrada a la venta.
 * El precio queda fijado al precio original del ticket (unitPrice).
 * No se acepta ningún parámetro de precio del cliente.
 */
async function listForResale({ ticketId, sellerUserId }) {
  const ticket = await Ticket.findOne({
    where: { id: ticketId, userId: sellerUserId, status: { [Op.in]: ['paid', 'valid'] } },
    include: [{ model: Event, as: 'event', attributes: ['id', 'startAt', 'title'] }],
  });

  if (!ticket) {
    const err = new Error('Entrada no encontrada o no disponible para reventa');
    err.status = 404;
    throw err;
  }

  if (new Date(ticket.event.startAt) <= new Date()) {
    const err = new Error('No se puede revender una entrada de un evento que ya ha comenzado');
    err.status = 400;
    throw err;
  }

  const existing = await TicketResale.findOne({
    where: { ticketId, status: { [Op.in]: ['listed', 'claimed'] } },
  });
  if (existing) {
    const err = new Error('Esta entrada ya tiene una oferta de reventa activa');
    err.status = 409;
    throw err;
  }

  // Precio bloqueado al precio original pagado por el vendedor
  const askPrice    = Number(ticket.unitPrice);
  const finalPrice  = Math.round(askPrice * (1 + BUYER_FEE)  * 100) / 100;
  const sellerPayout = Math.round(askPrice * (1 - SELLER_FEE) * 100) / 100;

  const resale = await TicketResale.create({
    ticketId,
    sellerUserId,
    eventId: ticket.eventId,
    askPrice,
    buyerFee: BUYER_FEE,
    sellerFee: SELLER_FEE,
    finalPrice,
    sellerPayout,
    status: 'listed',
    sellerPayoutStatus: 'pending',
  });

  // Retener el ticket mientras está en reventa
  await ticket.update({ status: 'pending' });

  return { resale, breakdown: { askPrice, finalPrice, sellerPayout, platformNet: finalPrice - sellerPayout } };
}

/**
 * Cancela una oferta de reventa y devuelve el ticket a 'valid'.
 */
async function cancelListing({ resaleId, sellerUserId }) {
  const resale = await TicketResale.findOne({
    where: { id: resaleId, sellerUserId, status: 'listed' },
    include: [{ model: Ticket, as: 'ticket' }],
  });
  if (!resale) {
    const err = new Error('Oferta de reventa no encontrada o ya procesada');
    err.status = 404;
    throw err;
  }
  await resale.ticket.update({ status: 'valid' });
  await resale.update({ status: 'cancelled' });
  return { ok: true };
}

/**
 * El comprador reclama una oferta.
 * Se invalida el ticket del vendedor y se emite uno nuevo con QR fresco para el comprador.
 * El pago al vendedor queda en sellerPayoutStatus='pending' hasta que el dashboard lo marque.
 */
async function claimResale({ resaleId, buyerUserId }) {
  const resale = await TicketResale.findOne({
    where: { id: resaleId, status: 'listed' },
    include: [{ model: Ticket, as: 'ticket' }],
  });

  if (!resale) {
    const err = new Error('Oferta no disponible');
    err.status = 404;
    throw err;
  }

  if (resale.sellerUserId === buyerUserId) {
    const err = new Error('No puedes comprar tu propia entrada');
    err.status = 400;
    throw err;
  }

  const newQrPayload = `tix_${uuidv4()}`;
  const oldTicket    = resale.ticket;

  await oldTicket.update({ status: 'cancelled' });

  const newTicket = await Ticket.create({
    eventId:    oldTicket.eventId,
    userId:     buyerUserId,
    orderId:    oldTicket.orderId,
    ticketType: oldTicket.ticketType,
    unitPrice:  resale.finalPrice,   // el comprador pagó el finalPrice
    qrPayload:  newQrPayload,
    status:     'valid',
  });

  await resale.update({
    buyerUserId,
    newQrPayload,
    status:     'completed',
    claimedAt:  new Date(),
    completedAt: new Date(),
    // El pago al vendedor queda pendiente hasta confirmación del dashboard
    sellerPayoutStatus: 'pending',
  });

  return {
    resale,
    newTicket: { id: newTicket.id, ticketType: newTicket.ticketType, qrPayload: newTicket.qrPayload },
    sellerPayout: Number(resale.sellerPayout),
  };
}

/**
 * Dashboard: lista todas las reventas completadas con pago al vendedor pendiente.
 */
async function listPendingPayouts({ venueId }) {
  return TicketResale.findAll({
    where: { status: 'completed', sellerPayoutStatus: 'pending' },
    include: [
      { model: User,   as: 'seller', attributes: ['id', 'fullName', 'email', 'phone'] },
      { model: User,   as: 'buyer',  attributes: ['id', 'fullName'] },
      {
        model: Event, as: 'event',
        where: venueId ? { venueId } : {},
        required: true,
        attributes: ['id', 'title', 'startAt', 'venueId'],
      },
    ],
    order: [['completedAt', 'ASC']],
  });
}

/**
 * Dashboard: marca el pago al vendedor como realizado.
 */
async function markSellerPaid({ resaleId }) {
  const resale = await TicketResale.findByPk(resaleId);
  if (!resale || resale.status !== 'completed') {
    const err = new Error('Reventa no encontrada o no completada');
    err.status = 404;
    throw err;
  }
  if (resale.sellerPayoutStatus === 'paid') {
    const err = new Error('Este pago ya fue registrado');
    err.status = 409;
    throw err;
  }
  await resale.update({ sellerPayoutStatus: 'paid', sellerPayoutAt: new Date() });
  return { ok: true, resaleId, sellerPayout: Number(resale.sellerPayout) };
}

module.exports = {
  listEventResales,
  myListings,
  myPurchases,
  listForResale,
  cancelListing,
  claimResale,
  listPendingPayouts,
  markSellerPaid,
};
