const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Ticket = sequelize.define(
  'Ticket',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    eventId: { type: DataTypes.UUID, allowNull: false },
    userId: { type: DataTypes.UUID, allowNull: false },
    orderId: { type: DataTypes.UUID, allowNull: true },
    ticketType: { type: DataTypes.STRING, allowNull: false },
    unitPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    qrPayload: { type: DataTypes.STRING, unique: true },
    status: {
      type: DataTypes.ENUM('pending', 'paid', 'valid', 'used', 'cancelled'),
      defaultValue: 'paid',
    },
  },
  { tableName: 'tickets' }
);

module.exports = Ticket;
