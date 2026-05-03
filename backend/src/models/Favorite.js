const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Favorite = sequelize.define(
  'Favorite',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: { type: DataTypes.UUID, allowNull: false },
    targetType: {
      type: DataTypes.ENUM('event', 'venue'),
      allowNull: false,
    },
    targetId: { type: DataTypes.UUID, allowNull: false },
  },
  {
    tableName: 'favorites',
    indexes: [
      { unique: true, fields: ['user_id', 'target_type', 'target_id'], name: 'favorites_user_target_uniq' },
      { fields: ['target_type', 'target_id'], name: 'favorites_target_idx' },
    ],
  }
);

module.exports = Favorite;
