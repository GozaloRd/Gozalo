/**
 * Alinea la contraseña del usuario postgres en tu instalación local con DB_PASSWORD del .env.
 *
 * Uso (PowerShell, desde la carpeta backend):
 *   $env:PGPASSWORD='TU_CONTRASEÑA_ACTUAL_DE_POSTGRES'; node scripts/align-postgres-password.js
 */
const path = require('path');
require('dotenv').config({
  path: path.join(__dirname, '..', '.env'),
  override: true,
});

const { Client } = require('pg');

function quoteIdent(ident) {
  return '"' + String(ident).replace(/"/g, '""') + '"';
}

function escapeStr(s) {
  return String(s).replace(/'/g, "''");
}

async function main() {
  const current = process.env.PGPASSWORD;
  if (!current) {
    console.error(
      'Falta PGPASSWORD (contraseña actual de postgres).\n' +
        "Ejemplo: $env:PGPASSWORD='la_que_usas_en_pgAdmin'; node scripts/align-postgres-password.js"
    );
    process.exit(1);
  }

  const host = process.env.DB_HOST || 'localhost';
  const port = Number(process.env.DB_PORT) || 5432;
  const user = (process.env.DB_USER || 'postgres').trim();
  const newPass = process.env.DB_PASSWORD != null ? String(process.env.DB_PASSWORD).trim() : '';
  const dbName = (process.env.DB_NAME || 'gozalo_db').trim();

  if (!newPass) {
    console.error('DB_PASSWORD vacío en backend/.env');
    process.exit(1);
  }

  const admin = new Client({
    host,
    port,
    user,
    password: current,
    database: 'postgres',
  });

  try {
    await admin.connect();
    await admin.query(
      `ALTER USER ${quoteIdent(user)} WITH PASSWORD '${escapeStr(newPass)}'`
    );
    console.log(`OK — contraseña de ${user} actualizada según backend/.env (${host}:${port}).`);
    await admin.end();
  } catch (e) {
    await admin.end().catch(() => {});
    if (e.code === '28P01') {
      console.error(
        'PGPASSWORD no coincide con la contraseña real en PostgreSQL. Usa la misma que en pgAdmin (usuario postgres).'
      );
    } else {
      console.error(e.message || e);
    }
    process.exit(1);
  }

  const appDb = new Client({
    host,
    port,
    user,
    password: newPass,
    database: dbName,
  });
  try {
    await appDb.connect();
    console.log(`OK — conexión a la base "${dbName}".`);
  } catch (e) {
    if (e.code === '3D000') {
      const creator = new Client({
        host,
        port,
        user,
        password: newPass,
        database: 'postgres',
      });
      await creator.connect();
      await creator.query(`CREATE DATABASE ${quoteIdent(dbName)}`);
      await creator.end();
      console.log(`Base "${dbName}" creada.`);
    } else {
      throw e;
    }
  } finally {
    await appDb.end().catch(() => {});
  }
}

main();
