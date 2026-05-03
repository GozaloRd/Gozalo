const path = require('path');
const { Sequelize } = require('sequelize');

// Carga explícita: si ejecutas node desde otra carpeta, dotenv por defecto no encuentra .env
// override: true — si Windows tiene DB_* en variables de entorno, sin esto el .env se ignora
require('dotenv').config({
  path: path.join(__dirname, '..', '..', '.env'),
  override: true,
});

const dbName = (process.env.DB_NAME || '').trim();
const dbUser = (process.env.DB_USER || '').trim();
const dbPassword = process.env.DB_PASSWORD != null ? String(process.env.DB_PASSWORD).trim() : '';

const commonOptions = {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  define: {
    underscored: true,
    timestamps: true,
  },
};

// Opcional: DATABASE_URL=postgresql://user:pass@host:5432/db (prioridad sobre DB_*)
const databaseUrl = (process.env.DATABASE_URL || '').trim();

const sequelize = databaseUrl
  ? new Sequelize(databaseUrl, commonOptions)
  : new Sequelize(dbName, dbUser, dbPassword, {
      ...commonOptions,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
    });

module.exports = sequelize;
