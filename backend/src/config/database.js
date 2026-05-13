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

// SSL requerido por Postgres gestionados (Supabase, Neon, Render, Heroku, RDS...).
// Se activa si DB_SSL=true, NODE_ENV=production, o si la URL incluye un host gestionado conocido.
const databaseUrl = (process.env.DATABASE_URL || '').trim();
const isManagedHost = /supabase\.co|neon\.tech|render\.com|amazonaws\.com|herokuapp\.com|railway\.app/i.test(
  databaseUrl
);
const sslEnabled =
  process.env.DB_SSL === 'true' ||
  process.env.NODE_ENV === 'production' ||
  isManagedHost;

const commonOptions = {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  define: {
    underscored: true,
    timestamps: true,
  },
  ...(sslEnabled
    ? {
        dialectOptions: {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        },
      }
    : {}),
};

const sequelize = databaseUrl
  ? new Sequelize(databaseUrl, commonOptions)
  : new Sequelize(dbName, dbUser, dbPassword, {
      ...commonOptions,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
    });

module.exports = sequelize;
