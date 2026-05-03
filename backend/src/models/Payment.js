const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payment = sequelize.define(
  'Payment',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    orderId: { type: DataTypes.UUID, allowNull: true },
    reservationId: { type: DataTypes.UUID, allowNull: true },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    method: {
      type: DataTypes.ENUM('cash', 'card', 'transfer', 'other'),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
      defaultValue: 'pending',
    },
    externalRef: DataTypes.STRING,
    commissionAmount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  },
  { tableName: 'payments' }
);

module.exports = Payment;
