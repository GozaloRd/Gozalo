const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Cada participante (incluyendo el organizador) en un split.
 * status: 'invited' → 'paid' → (el split completo pasa a 'complete')
 */
const SplitParticipant = sequelize.define(
  'SplitParticipant',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    splitId: { type: DataTypes.UUID, allowNull: false },
    userId: { type: DataTypes.UUID, allowNull: true },
    /** Email opcional para invitados sin cuenta */
    email: { type: DataTypes.STRING, allowNull: true },
    nickname: { type: DataTypes.STRING, allowNull: true },
    status: {
      type: DataTypes.ENUM('invited', 'paid', 'declined'),
      defaultValue: 'invited',
    },
    paidAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: 'split_participants',
    indexes: [
      { fields: ['split_id'], name: 'participant_split_idx' },
      { fields: ['user_id'], name: 'participant_user_idx' },
    ],
  }
);

module.exports = SplitParticipant;
