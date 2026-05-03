const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Invitado en lista VIP / cortesía. A diferencia de Ticket/Reservation, NO descuenta
 * del aforo de pago: pensado para prensa, artistas, invitados del dueño, promotores, etc.
 *
 * Cada entrada incluye `partySize` (titular + acompañantes); el QR único cubre a todo
 * el grupo (check-in por bulto, como listas físicas en papel). Se puede escanear por la
 * misma ruta /api/access si el payload empieza por "GL:".
 */
const GuestListEntry = sequelize.define(
  'GuestListEntry',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    eventId: { type: DataTypes.UUID, allowNull: false },
    venueId: { type: DataTypes.UUID, allowNull: false },
    createdByUserId: { type: DataTypes.UUID, allowNull: true },
    fullName: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, allowNull: true },
    email: { type: DataTypes.STRING, allowNull: true },
    partySize: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    // categoría libre: "VIP", "Prensa", "Artista", "Staff", "Cortesía dueño", etc.
    category: { type: DataTypes.STRING, allowNull: true, defaultValue: 'VIP' },
    notes: { type: DataTypes.STRING(500), allowNull: true },
    qrPayload: { type: DataTypes.STRING, unique: true, allowNull: false },
    status: {
      type: DataTypes.ENUM('pending', 'checked_in', 'no_show', 'cancelled'),
      defaultValue: 'pending',
    },
    checkedInAt: { type: DataTypes.DATE, allowNull: true },
    checkedInBy: { type: DataTypes.UUID, allowNull: true },
  },
  {
    tableName: 'guest_list_entries',
    indexes: [
      { fields: ['event_id', 'status'], name: 'guestlist_event_status_idx' },
      { fields: ['venue_id'], name: 'guestlist_venue_idx' },
    ],
  }
);

module.exports = GuestListEntry;
