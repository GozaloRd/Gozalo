const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Order = sequelize.define(
  'Order',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: { type: DataTypes.UUID, allowNull: true },
    venueId: { type: DataTypes.UUID, allowNull: false },
    eventId: { type: DataTypes.UUID, allowNull: true },
    tableId: { type: DataTypes.UUID, allowNull: true },
    waiterId: { type: DataTypes.UUID, allowNull: true },
    type: {
      type: DataTypes.ENUM('pos', 'tickets', 'mixed'),
      defaultValue: 'pos',
    },
    status: {
      type: DataTypes.ENUM('open', 'paid', 'cancelled'),
      defaultValue: 'open',
    },
    subtotal: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    tax: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    total: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    /** Envío correo confirmación entrada (Resend); null = pendiente / no aplicable */
    ticketEmailSentAt: { type: DataTypes.DATE, allowNull: true },
    /** Último error Resend/envío (no debe abortar la compra) */
    ticketEmailSendError: { type: DataTypes.TEXT, allowNull: true },
  },
  { tableName: 'orders' }
);

module.exports = Order;
