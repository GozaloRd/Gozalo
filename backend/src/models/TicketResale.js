const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Reventa oficial de entradas nominativas dentro de la app.
 *
 * Reglas de precio:
 *   - El vendedor SOLO puede revender al precio exacto que pagó (unitPrice del ticket).
 *   - El comprador paga ese precio + 10 % de fee de plataforma.
 *   - Al vendedor se le descuenta un 10 % de comisión sobre su precio.
 *   - La plataforma ingresa el fee del comprador + la comisión del vendedor.
 *
 * Ejemplo con ticket de 1.000 DOP:
 *   askPrice    = 1.000  (precio original del ticket)
 *   finalPrice  = 1.100  (lo que paga el comprador: +10 %)
 *   sellerPayout= 900    (lo que recibe el vendedor:  -10 %)
 *   platformNet = 200    (100 del comprador + 100 del vendedor)
 *
 * Flujo:
 *   1. Vendedor publica (status='listed'), ticket pasa a 'pending'.
 *   2. Comprador reclama (status='completed'), se emite nuevo QR para el comprador.
 *   3. Dashboard marca el pago al vendedor (sellerPayoutStatus='paid').
 */
const TicketResale = sequelize.define(
  'TicketResale',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    ticketId: { type: DataTypes.UUID, allowNull: false },
    sellerUserId: { type: DataTypes.UUID, allowNull: false },
    buyerUserId: { type: DataTypes.UUID, allowNull: true },
    eventId: { type: DataTypes.UUID, allowNull: false },
    /** Precio original pagado por el vendedor (bloqueado, no editable) */
    askPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    /** Fee de plataforma al comprador (decimal, 0.10 = 10 %) */
    buyerFee: { type: DataTypes.DECIMAL(5, 4), defaultValue: 0.10 },
    /** Comisión de plataforma al vendedor (decimal, 0.10 = 10 %) */
    sellerFee: { type: DataTypes.DECIMAL(5, 4), defaultValue: 0.10 },
    /** Lo que paga el comprador = askPrice * (1 + buyerFee) */
    finalPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    /** Lo que recibirá el vendedor = askPrice * (1 - sellerFee) */
    sellerPayout: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    status: {
      type: DataTypes.ENUM('listed', 'claimed', 'completed', 'cancelled', 'expired'),
      defaultValue: 'listed',
    },
    /** Estado del pago pendiente al vendedor */
    sellerPayoutStatus: {
      type: DataTypes.ENUM('pending', 'paid'),
      defaultValue: 'pending',
    },
    sellerPayoutAt: { type: DataTypes.DATE, allowNull: true },
    /** QR del nuevo ticket generado para el comprador */
    newQrPayload: { type: DataTypes.STRING, allowNull: true },
    listedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    claimedAt: { type: DataTypes.DATE, allowNull: true },
    completedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: 'ticket_resales',
    indexes: [
      { fields: ['ticket_id'], name: 'resale_ticket_idx' },
      { fields: ['event_id', 'status'], name: 'resale_event_status_idx' },
      { fields: ['seller_user_id'], name: 'resale_seller_idx' },
    ],
  }
);

module.exports = TicketResale;
