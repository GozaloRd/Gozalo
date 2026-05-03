const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Split-payment: divide el coste de una entrada o reserva entre varios amigos.
 * El "organizador" crea el split; los demás reciben un link/token para pagar su parte.
 *
 * targetType: 'ticket' | 'reservation'
 * targetId:   UUID del ticket o reserva en cuestión
 * totalAmount: precio total a dividir
 * shareAmount: lo que toca pagar a cada uno (totalAmount / participants)
 */
const SplitPayment = sequelize.define(
  'SplitPayment',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    organizerUserId: { type: DataTypes.UUID, allowNull: false },
    targetType: {
      type: DataTypes.ENUM('ticket', 'reservation'),
      allowNull: false,
    },
    targetId: { type: DataTypes.UUID, allowNull: false },
    eventId: { type: DataTypes.UUID, allowNull: false },
    totalAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    /** Número de partes en que se divide */
    parts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 2 },
    shareAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    status: {
      type: DataTypes.ENUM('open', 'complete', 'cancelled'),
      defaultValue: 'open',
    },
    /** Token público (corto) para invitar via link */
    inviteToken: { type: DataTypes.STRING, allowNull: false, unique: true },
    expiresAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: 'split_payments',
    indexes: [
      { fields: ['organizer_user_id'], name: 'split_organizer_idx' },
      { fields: ['event_id', 'status'], name: 'split_event_status_idx' },
      { unique: true, fields: ['invite_token'], name: 'split_token_uniq' },
    ],
  }
);

module.exports = SplitPayment;
