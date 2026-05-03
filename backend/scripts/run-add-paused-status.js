/**
 * Añade el valor 'paused' al ENUM de events.status (PostgreSQL).
 * Idempotente: ignora error si el valor ya existe.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), override: true });
const sequelize = require('../src/config/database');

async function main() {
  try {
    await sequelize.query(
      "ALTER TYPE enum_events_status ADD VALUE IF NOT EXISTS 'paused'"
    );
    console.log('OK: enum_events_status incluye paused');
  } catch (e) {
    if (e?.parent?.code === '42710' || String(e?.message || '').includes('already exists')) {
      console.log('OK: paused ya existía');
    } else {
      console.error(e);
      process.exit(1);
    }
  } finally {
    await sequelize.close();
  }
}

main();
