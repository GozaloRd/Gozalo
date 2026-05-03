const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const { SplitPayment, SplitParticipant, Ticket, Reservation, Event, User } = require('../models');

function generateToken() {
  return uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase();
}

/**
 * Crea un split-payment para una entrada o reserva.
 * El organizador paga su parte (1/parts); el resto son invitados.
 */
async function createSplit({ organizerUserId, targetType, targetId, parts, nicknames = [] }) {
  if (!['ticket', 'reservation'].includes(targetType)) {
    const err = new Error('targetType debe ser ticket o reservation');
    err.status = 400;
    throw err;
  }

  const numParts = Math.max(2, Math.min(10, Number(parts) || 2));

  let totalAmount, eventId, targetTitle;
  if (targetType === 'ticket') {
    const ticket = await Ticket.findOne({
      where: { id: targetId, userId: organizerUserId, status: { [Op.in]: ['paid', 'valid'] } },
      include: [{ model: Event, as: 'event', attributes: ['id', 'title', 'startAt'] }],
    });
    if (!ticket) {
      const err = new Error('Entrada no encontrada o no te pertenece');
      err.status = 404;
      throw err;
    }
    totalAmount = Number(ticket.unitPrice);
    eventId = ticket.eventId;
    targetTitle = `${ticket.ticketType} · ${ticket.event.title}`;
  } else {
    const res = await Reservation.findOne({
      where: { id: targetId, userId: organizerUserId, status: { [Op.in]: ['pending', 'confirmed'] } },
      include: [{ model: Event, as: 'event', attributes: ['id', 'title', 'startAt'] }],
    });
    if (!res) {
      const err = new Error('Reserva no encontrada o no te pertenece');
      err.status = 404;
      throw err;
    }
    totalAmount = Number(res.totalAmount);
    eventId = res.eventId;
    targetTitle = `Mesa · ${res.event.title}`;
  }

  if (totalAmount <= 0) {
    const err = new Error('El importe total debe ser mayor a 0');
    err.status = 400;
    throw err;
  }

  const shareAmount = Math.round((totalAmount / numParts) * 100) / 100;
  const inviteToken = generateToken();

  // Caducidad: 48h desde creación
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  const split = await SplitPayment.create({
    organizerUserId,
    targetType,
    targetId,
    eventId,
    totalAmount,
    parts: numParts,
    shareAmount,
    inviteToken,
    expiresAt,
    status: 'open',
  });

  // Crear participante del organizador ya como 'paid'
  await SplitParticipant.create({
    splitId: split.id,
    userId: organizerUserId,
    nickname: 'Tú (organizador)',
    status: 'paid',
    paidAt: new Date(),
  });

  // Crear slots vacíos para el resto
  for (let i = 1; i < numParts; i++) {
    await SplitParticipant.create({
      splitId: split.id,
      userId: null,
      nickname: nicknames[i - 1] || `Amigo ${i}`,
      status: 'invited',
    });
  }

  return {
    id: split.id,
    inviteToken,
    shareAmount,
    totalAmount,
    parts: numParts,
    expiresAt,
    inviteLink: `/split/${inviteToken}`,
    targetTitle,
  };
}

/**
 * Carga un split por token público (para que un amigo vea su parte).
 */
async function getSplitByToken(inviteToken) {
  const split = await SplitPayment.findOne({
    where: { inviteToken },
    include: [
      { model: SplitParticipant, as: 'participants', include: [{ model: User, as: 'user', attributes: ['id', 'fullName'] }] },
      { model: User, as: 'organizer', attributes: ['id', 'fullName'] },
      { model: Event, as: 'event', attributes: ['id', 'title', 'startAt', 'coverImageUrl'] },
    ],
  });

  if (!split) {
    const err = new Error('Link de split no encontrado o caducado');
    err.status = 404;
    throw err;
  }

  if (split.expiresAt && new Date(split.expiresAt) < new Date()) {
    if (split.status === 'open') await split.update({ status: 'cancelled' });
    const err = new Error('Este link de split ha caducado');
    err.status = 410;
    throw err;
  }

  return split;
}

/**
 * Un amigo acepta pagar su parte (simula el pago; en prod iría pasarela).
 */
async function payShare({ inviteToken, userId }) {
  const split = await getSplitByToken(inviteToken);

  if (split.status !== 'open') {
    const err = new Error(`El split ya está ${split.status}`);
    err.status = 400;
    throw err;
  }

  // Buscar un slot libre (sin userId)
  const freeSlot = split.participants.find((p) => !p.userId && p.status === 'invited');
  if (!freeSlot) {
    const err = new Error('No hay plazas disponibles en este split');
    err.status = 400;
    throw err;
  }

  // ¿Ya participa?
  const alreadyIn = split.participants.find((p) => p.userId === userId);
  if (alreadyIn) {
    const err = new Error('Ya estás participando en este split');
    err.status = 409;
    throw err;
  }

  await freeSlot.update({ userId, status: 'paid', paidAt: new Date() });

  // Recargar para verificar si todos pagaron
  await split.reload({ include: [{ model: SplitParticipant, as: 'participants' }] });
  const allPaid = split.participants.every((p) => p.status === 'paid');
  if (allPaid) {
    await split.update({ status: 'complete' });
  }

  return {
    splitId: split.id,
    shareAmount: split.shareAmount,
    allPaid,
    status: split.status,
  };
}

/**
 * Lista mis splits como organizador.
 */
async function mySplits(organizerUserId) {
  return SplitPayment.findAll({
    where: { organizerUserId },
    include: [
      { model: SplitParticipant, as: 'participants', include: [{ model: User, as: 'user', attributes: ['id', 'fullName'] }] },
      { model: Event, as: 'event', attributes: ['id', 'title', 'startAt'] },
    ],
    order: [['createdAt', 'DESC']],
    limit: 20,
  });
}

module.exports = { createSplit, getSplitByToken, payShare, mySplits };
