const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EventTicketType = sequelize.define(
  'EventTicketType',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    eventId: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    code: { type: DataTypes.STRING, allowNull: true },
    description: DataTypes.TEXT,
    price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    quantityTotal: { type: DataTypes.INTEGER, allowNull: true },
    /** Si false, no se muestra el cupo al público (sigue aplicando en servidor al comprar). */
    showQuantityPublic: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    soldCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    active: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { tableName: 'event_ticket_types' }
);

module.exports = EventTicketType;
