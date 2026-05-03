const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Venue = sequelize.define(
  'Venue',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    ownerId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    name: { type: DataTypes.STRING, allowNull: false },
    slug: { type: DataTypes.STRING, allowNull: false, unique: true },
    description: DataTypes.TEXT,
    city: { type: DataTypes.STRING, allowNull: false },
    address: DataTypes.STRING,
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected', 'suspended'),
      defaultValue: 'pending',
    },
    capacity: { type: DataTypes.INTEGER, defaultValue: 0 },
    coverImageUrl: DataTypes.STRING,
    /** Datos bancarios / referencia de transferencia (configurables por el local) */
    payoutProfile: DataTypes.JSON,
  },
  { tableName: 'venues' }
);

module.exports = Venue;
