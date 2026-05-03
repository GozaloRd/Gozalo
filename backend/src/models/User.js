const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fullName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phone: DataTypes.STRING,
    role: {
      type: DataTypes.ENUM('customer', 'venue_owner', 'admin', 'staff'),
      allowNull: false,
      defaultValue: 'customer',
    },
    points: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    avatarUrl: DataTypes.STRING,
  },
  {
    tableName: 'users',
  }
);

module.exports = User;
