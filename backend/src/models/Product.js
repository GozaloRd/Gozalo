const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Product = sequelize.define(
  'Product',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    venueId: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    sku: DataTypes.STRING,
    category: { type: DataTypes.STRING, allowNull: false },
    price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    active: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { tableName: 'products' }
);

module.exports = Product;
