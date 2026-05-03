const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const VenueTable = sequelize.define(
  'VenueTable',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    venueId: { type: DataTypes.UUID, allowNull: false },
    eventId: { type: DataTypes.UUID, allowNull: true },
    zone: { type: DataTypes.STRING, allowNull: false },
    label: { type: DataTypes.STRING, allowNull: false },
    capacity: { type: DataTypes.INTEGER, defaultValue: 4 },
    minPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    /** 1–100: % del total a pagar al reservar online (100 = pago completo). */
    initialPaymentPercent: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 50 },
    posX: { type: DataTypes.FLOAT, defaultValue: 0 },
    posY: { type: DataTypes.FLOAT, defaultValue: 0 },
    active: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { tableName: 'venue_tables' }
);

module.exports = VenueTable;
