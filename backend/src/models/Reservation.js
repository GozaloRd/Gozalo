const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Reservation = sequelize.define(
  'Reservation',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: { type: DataTypes.UUID, allowNull: false },
    eventId: { type: DataTypes.UUID, allowNull: false },
    tableId: { type: DataTypes.UUID, allowNull: false },
    status: {
      type: DataTypes.ENUM(
        'pending',
        'confirmed',
        'checked_in',
        'cancelled',
        'completed',
        'no_show'
      ),
      defaultValue: 'pending',
    },
    partySize: { type: DataTypes.INTEGER, allowNull: false },
    totalAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    qrPayload: { type: DataTypes.STRING, unique: true },
    notes: DataTypes.TEXT,
    checkedInAt: DataTypes.DATE,
  },
  { tableName: 'reservations' }
);

module.exports = Reservation;
