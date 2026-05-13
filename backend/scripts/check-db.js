/**
 * Prueba la conexión con los mismos valores que la API (lee backend/.env con override).
 * Uso: desde la carpeta backend: npm run db:check
 */
const path = require('path');
require('dotenv').config({
  path: path.join(__dirname, '..', '.env'),
  override: true,
});

const { Client } = require('pg');

async function main() {
  const databaseUrl = (process.env.DATABASE_URL || '').trim();

  if (databaseUrl) {
    console.log('Probando DATABASE_URL (sin mostrar credenciales)');
    const isManagedHost =
      /supabase\.co|neon\.tech|render\.com|amazonaws\.com|herokuapp\.com|railway\.app/i.test(
        databaseUrl
      );
    const ssl =
      process.env.DB_SSL === 'true' ||
      process.env.NODE_ENV === 'production' ||
      isManagedHost
        ? { rejectUnauthorized: false }
        : undefined;
    const client = new Client({ connectionString: databaseUrl, ssl });
    try {
      await client.connect();
      const r = await client.query('SELECT current_database(), current_user');
      console.log('OK — conexión correcta:', r.rows[0]);
    } catch (e) {
      console.error('Fallo:', e.code || '', e.message);
      process.exit(1);
    } finally {
      await client.end().catch(() => {});
    }
    return;
  }

  const host = process.env.DB_HOST || 'localhost';
  const port = Number(process.env.DB_PORT) || 5432;
  const user = (process.env.DB_USER || '').trim();
  const password = process.env.DB_PASSWORD != null ? String(process.env.DB_PASSWORD).trim() : '';
  const database = (process.env.DB_NAME || '').trim();

  console.log(
    `Probando: ${user}@${host}:${port}/${database} (contraseña: ${password.length} caracteres)`
  );

  if (!user || !database) {
    console.error('Falta DB_USER o DB_NAME en .env (o define DATABASE_URL)');
    process.exit(1);
  }

  const client = new Client({ host, port, user, password, database });
  try {
    await client.connect();
    const r = await client.query('SELECT current_database(), current_user');
    console.log('OK — conexión correcta:', r.rows[0]);
  } catch (e) {
    console.error('Fallo:', e.code || '', e.message);
    if (e.code === '28P01') {
      console.error(
        'La contraseña en PostgreSQL no coincide con DB_PASSWORD. Actualiza una de las dos para que sean idénticas.'
      );
    }
    if (e.code === '3D000') {
      console.error(`Crea la base: CREATE DATABASE ${database};`);
    }
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
}

main();
