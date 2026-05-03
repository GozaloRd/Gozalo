const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AccessLog = sequelize.define(
  'AccessLog',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    eventId: { type: DataTypes.UUID, allowNull: false },
    reservationId: { type: DataTypes.UUID, allowNull: true },
    ticketId: { type: DataTypes.UUID, allowNull: true },
    scannedByUserId: { type: DataTypes.UUID, allowNull: true },
    success: { type: DataTypes.BOOLEAN, allowNull: false },
    message: DataTypes.STRING,
  },
  { tableName: 'access_logs' }
);

module.exports = AccessLog;
