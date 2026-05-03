const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CashClosing = sequelize.define(
  'CashClosing',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    venueId: { type: DataTypes.UUID, allowNull: false },
    eventId: { type: DataTypes.UUID, allowNull: true },
    closedByUserId: { type: DataTypes.UUID, allowNull: true },
    cashTotal: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    cardTotal: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    transferTotal: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    otherTotal: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    grandTotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    notes: DataTypes.TEXT,
    metadata: DataTypes.JSON,
  },
  { tableName: 'cash_closings' }
);

module.exports = CashClosing;
