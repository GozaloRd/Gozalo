const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EventWaitlist = sequelize.define(
  'EventWaitlist',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    eventId: { type: DataTypes.UUID, allowNull: false },
    userId: { type: DataTypes.UUID, allowNull: false },
    partySize: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    ticketTypeId: { type: DataTypes.UUID, allowNull: true },
    // "waiting": en cola; "offered": aviso enviado, puede comprar; "claimed": reclamado;
    // "expired": aviso no reclamado en ventana; "cancelled": usuario salió de la lista.
    status: {
      type: DataTypes.ENUM('waiting', 'offered', 'claimed', 'expired', 'cancelled'),
      defaultValue: 'waiting',
    },
    notifiedAt: { type: DataTypes.DATE, allowNull: true },
    claimedAt: { type: DataTypes.DATE, allowNull: true },
    note: { type: DataTypes.STRING(500), allowNull: true },
  },
  {
    tableName: 'event_waitlist',
    indexes: [
      { unique: true, fields: ['event_id', 'user_id'], name: 'waitlist_event_user_uniq' },
      { fields: ['event_id', 'status'], name: 'waitlist_event_status_idx' },
    ],
  }
);

module.exports = EventWaitlist;
