const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Event = sequelize.define(
  'Event',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    venueId: { type: DataTypes.UUID, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    slug: { type: DataTypes.STRING, allowNull: false },
    description: DataTypes.TEXT,
    category: { type: DataTypes.STRING, allowNull: false },
    city: { type: DataTypes.STRING, allowNull: false },
    startAt: { type: DataTypes.DATE, allowNull: false },
    endAt: { type: DataTypes.DATE, allowNull: false },
    coverImageUrl: DataTypes.STRING,
    /** Plano o foto del salón para mesas reservables (público en /reservar) */
    tableLayoutImageUrl: DataTypes.STRING,
    /** Galería promocional: array de URLs (JSON) */
    images: DataTypes.JSON,
    /** Fotos del recap (subidas tras el evento): array de URLs (JSON) */
    collagePhotos: DataTypes.JSON,
    /** Si es true, el evento pasado puede listarse en /collage y mostrar recuerdos al público */
    includeInCollage: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    /** Autorización explícita en el panel (Collage) antes de publicar; sin esto no entra a /collage */
    collageAuthorized: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    /** Precio base de entrada general (RD$); complementa tipos de ticket */
    basePrice: DataTypes.DECIMAL(12, 2),
    /** Aforo máximo del evento (opcional) */
    maxCapacity: DataTypes.INTEGER,
    status: {
      type: DataTypes.ENUM('draft', 'published', 'paused', 'cancelled'),
      defaultValue: 'draft',
    },
    featured: { type: DataTypes.BOOLEAN, defaultValue: false },
    requiresCoverForTable: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    publicado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    destacado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    /**
     * Regla de recurrencia si este evento es la PLANTILLA raíz de una serie semanal.
     * Estructura: { type: 'weekly', weeksGenerated: number, until?: iso, lastGeneratedAt?: iso }
     * Los eventos hijos NO llevan este campo — solo el padre.
     */
    recurrenceRule: { type: DataTypes.JSON, allowNull: true },
    /** Si este evento fue generado por una plantilla, apunta al id del padre. */
    recurrenceParentId: { type: DataTypes.UUID, allowNull: true },

    /** `parallel`: todos los tipos activos a la vez. `sequential`: cola por `sort_order` en tipos de ticket. */
    ticketSaleMode: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'parallel',
    },

    // ── Oleada 3: Rider técnico + setlist ──────────────────────────────────
    /** Array de URLs de archivos del rider técnico (PDF, imágenes) */
    riderFiles: { type: DataTypes.JSON, allowNull: true },
    /** Array de tracks del setlist: [{position, title, artist, duration?, notes?}] */
    setlist: { type: DataTypes.JSON, allowNull: true },
    /** Notas extra del artista para el equipo del local */
    artistNotes: { type: DataTypes.TEXT, allowNull: true },

    // ── Oleada 3: Chat / WhatsApp del staff ────────────────────────────────
    /** Link de grupo WhatsApp del staff para este evento */
    staffWhatsappLink: { type: DataTypes.STRING, allowNull: true },

    /** Metadatos del asistente móvil (ubicación, políticas, toggles no cubiertos por columnas) */
    wizardMeta: { type: DataTypes.JSON, allowNull: true },
  },
  {
    tableName: 'events',
    indexes: [{ unique: true, fields: ['venue_id', 'slug'] }],
    hooks: {
      beforeValidate(event) {
        if (event.status === 'published') {
          if (event.publicado === undefined || event.publicado === null) event.publicado = true;
        } else if (event.publicado === undefined || event.publicado === null) {
          event.publicado = false;
        }

        if (!event.publicado) {
          event.destacado = false;
          event.featured = false;
        } else if (event.destacado === true) {
          event.featured = true;
        } else if (event.featured === true) {
          event.destacado = true;
        } else {
          event.destacado = false;
          event.featured = false;
        }
      },
    },
  }
);

module.exports = Event;
