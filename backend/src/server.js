const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config({
  path: path.join(__dirname, '..', '.env'),
  override: true,
});

const { sequelize } = require('./models');

// const authRoutes = require('./routes/auth'); // Router viejo (migración)
const authRoutes = require('./routes/auth.routes');
// const venuesRoutes = require('./routes/venues'); // Router viejo (migración)
const venuesRoutes = require('./routes/venues.routes');
// const eventsRoutes = require('./routes/events'); // Router viejo (migración)
const eventsRoutes = require('./routes/events.routes');
// const reservationsRoutes = require('./routes/reservations'); // Router viejo (migración)
const reservationsRoutes = require('./routes/reservations.routes');
// const ticketsRoutes = require('./routes/tickets'); // Router viejo (migración)
const ticketsRoutes = require('./routes/tickets.routes');
// const posRoutes = require('./routes/pos'); // Router viejo (migración)
const posRoutes = require('./routes/pos.routes');
// const accessRoutes = require('./routes/access'); // Router viejo (migración)
const accessRoutes = require('./routes/access.routes');
// const adminRoutes = require('./routes/admin'); // Router viejo (migración)
const adminRoutes = require('./routes/admin.routes');
// const dashboardRoutes = require('./routes/dashboard'); // Router viejo (migración)
const dashboardRoutes = require('./routes/dashboard.routes');
// const uploadRoutes = require('./routes/upload'); // Router viejo (migración)
const uploadRoutes = require('./routes/upload.routes');
const waitlistRoutes = require('./routes/waitlist.routes');
const splitRoutes = require('./routes/split.routes');

const app = express();
const PORT = process.env.PORT || 4000;

// FRONTEND_URL admite varias URLs separadas por coma (p. ej. dominio + preview de Vercel).
// FRONTEND_URL_REGEX permite un patrón (p. ej. ^https://.*\.vercel\.app$ para todos los previews).
const allowedOrigins = [
  ...(process.env.FRONTEND_URL || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
];

let originRegex = null;
if (process.env.FRONTEND_URL_REGEX) {
  try {
    originRegex = new RegExp(process.env.FRONTEND_URL_REGEX);
  } catch (e) {
    console.warn('[CORS] FRONTEND_URL_REGEX inválido, ignorando:', e.message);
  }
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (originRegex && originRegex.test(origin)) return callback(null, true);
      return callback(new Error(`CORS bloqueado para origen: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/api/upload', uploadRoutes);

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'gozalo-api', slogan: 'Tu noche comienza aquí' });
});

app.use('/api/auth', authRoutes);
app.use('/api/venues', venuesRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/reservations', reservationsRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/access', accessRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/split', splitRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  const status = err.status || 500;
  const msg =
    process.env.NODE_ENV === 'development'
      ? err.message || 'Error interno'
      : 'Error interno';
  res.status(status).json({ error: msg });
});

async function start() {
  if (process.env.NODE_ENV === 'development') {
    if ((process.env.DATABASE_URL || '').trim()) {
      console.log('[DB] Usando DATABASE_URL');
    } else {
      const h = process.env.DB_HOST || 'localhost';
      const p = process.env.DB_PORT || '5432';
      const n = process.env.DB_NAME || '';
      const u = process.env.DB_USER || '';
      const pwLen = String(process.env.DB_PASSWORD || '').length;
      console.log(
        `[DB] Intentando: ${u}@${h}:${p}/${n} (longitud contraseña en .env: ${pwLen})`
      );
    }
  }
  try {
    await sequelize.authenticate();
  } catch (e) {
    if (e?.parent?.code === '28P01' || e?.original?.code === '28P01') {
      console.error(
        '[DB] Contraseña rechazada (28P01). Opciones: (1) En PowerShell, contraseña ACTUAL en PGPASSWORD y ejecuta npm run db:align en backend. (2) Instala Docker y npm run db:up + DB_PORT=5433 en .env.'
      );
    }
    throw e;
  }
  // En desarrollo, altera tablas para añadir columnas nuevas (p. ej. checked_in_at en reservations).
  // En producción: DB_SYNC_ALTER=0 y migraciones SQL explícitas.
  const syncAlter = process.env.DB_SYNC_ALTER !== '0' && process.env.NODE_ENV !== 'production';
  try {
    await sequelize.sync({ alter: syncAlter });
    if (syncAlter) {
      console.log('[DB] sync({ alter: true }) aplicado — esquema alineado con los modelos');
    }
  } catch (e) {
    console.error('[DB] Error en sequelize.sync:', e.message);
    console.error(
      'Si fallan ENUMs en PostgreSQL, ejecuta migraciones manualmente o revisa enum_reservations_status / enum_tickets_status'
    );
    throw e;
  }
  app.listen(PORT, () => {
    console.log(`Gózalo API http://localhost:${PORT}`);
  });
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
