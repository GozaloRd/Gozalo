const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const VenueStaff = sequelize.define(
  'VenueStaff',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    venueId: { type: DataTypes.UUID, allowNull: false },
    userId: { type: DataTypes.UUID, allowNull: false },
    staffRole: {
      type: DataTypes.ENUM('waiter', 'cashier', 'rrpp', 'porter', 'manager'),
      allowNull: false,
    },
    commissionPercent: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
    active: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  {
    tableName: 'venue_staff',
    indexes: [{ unique: true, fields: ['venue_id', 'user_id'] }],
  }
);

module.exports = VenueStaff;
