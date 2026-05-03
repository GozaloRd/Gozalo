/**
 * Eventos de prueba para listados, tickets y mesas (event_id).
 * Uso: npm run seed:events
 */
const path = require('path');
require('dotenv').config({
  path: path.join(__dirname, '..', '.env'),
  override: true,
});

const bcrypt = require('bcryptjs');
const {
  sequelize,
  User,
  Venue,
  Event,
  VenueTable,
  EventTicketType,
} = require('../src/models');

function slugify(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** Próxima ocurrencia de ese día de la semana con hora (si ya pasó hoy, la siguiente semana). */
function nextOccurrence(dayOfWeek, hour, minute) {
  const now = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    if (d.getDay() !== dayOfWeek) continue;
    d.setHours(hour, minute, 0, 0);
    if (d > now) return d;
  }
  const d = new Date(now);
  d.setDate(now.getDate() + 7);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function eventEnd(start, hoursLater) {
  const e = new Date(start);
  e.setHours(e.getHours() + hoursLater);
  return e;
}

async function ensureVenue() {
  let venue = await Venue.findOne({
    where: { status: 'approved' },
    order: [['createdAt', 'ASC']],
  });
  if (venue) {
    console.log(`📍 Usando venue aprobado: ${venue.name} (${venue.id})`);
    return venue;
  }

  const email = (process.env.SEED_EVENTS_OWNER_EMAIL || 'seed-events-owner@gozalo.local')
    .trim()
    .toLowerCase();
  const password = process.env.SEED_EVENTS_OWNER_PASSWORD || 'seedevents123';
  const hash = await bcrypt.hash(password, 10);

  const [owner] = await User.findOrCreate({
    where: { email },
    defaults: {
      email,
      passwordHash: hash,
      fullName: 'Dueño Seed Eventos',
      role: 'venue_owner',
    },
  });
  if (owner.role !== 'venue_owner') {
    owner.role = 'venue_owner';
    await owner.save();
  }

  const base = 'local-seed-eventos';
  let slug = base;
  let n = 1;
  while (await Venue.findOne({ where: { slug } })) {
    slug = `${base}-${n++}`;
  }

  venue = await Venue.create({
    ownerId: owner.id,
    name: 'Local Seed Eventos',
    slug,
    description: 'Creado automáticamente por seed:events (no había venues aprobados).',
    city: 'Santo Domingo',
    address: 'Demo',
    capacity: 500,
    status: 'approved',
  });
  console.log(`📍 Venue de prueba creado y aprobado: ${venue.name} (${venue.id})`);
  return venue;
}

async function uniqueEventSlug(venueId, title) {
  const base = slugify(title);
  let slug = base;
  let i = 1;
  while (await Event.findOne({ where: { venueId, slug } })) {
    slug = `${base}-${i++}`;
  }
  return slug;
}

const EVENT_SPECS = [
  {
    title: 'Noche de Reggaetón',
    category: 'música',
    city: 'Santo Domingo',
    coverImageUrl:
      'https://images.unsplash.com/photo-1571266028243-d220c6a7f2d4?w=800',
    images: [
      'https://images.unsplash.com/photo-1571266028243-d220c6a7f2d4?w=800',
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800',
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
    ],
    start: () => nextOccurrence(5, 22, 0),
    ticketTypes: [
      { name: 'General', price: 500, quantityTotal: 100 },
      { name: 'VIP', price: 1500, quantityTotal: 20 },
    ],
    tables: [
      { label: 'Mesa VIP-1', zone: 'VIP', capacity: 6, minPrice: 3000, posX: 28, posY: 38 },
      { label: 'Mesa VIP-2', zone: 'VIP', capacity: 4, minPrice: 2000, posX: 48, posY: 38 },
      { label: 'Mesa T-1', zone: 'Terraza', capacity: 8, minPrice: 1500, posX: 68, posY: 58 },
    ],
  },
  {
    title: 'Salsa & Ron Night',
    category: 'música',
    city: 'Santiago',
    coverImageUrl:
      'https://images.unsplash.com/photo-1545128485-c400e7702796?w=800',
    images: [
      'https://images.unsplash.com/photo-1545128485-c400e7702796?w=800',
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800',
    ],
    start: () => nextOccurrence(6, 21, 0),
    ticketTypes: [
      { name: 'General', price: 300, quantityTotal: 200 },
      { name: 'Premium', price: 800, quantityTotal: 30 },
    ],
    tables: [
      { label: 'Mesa 1', zone: 'Pista', capacity: 6, minPrice: 1000, posX: 35, posY: 52 },
      { label: 'Mesa 2', zone: 'Pista', capacity: 4, minPrice: 1000, posX: 55, posY: 52 },
      { label: 'Mesa Bar-1', zone: 'Barra', capacity: 3, minPrice: 800, posX: 72, posY: 35 },
    ],
  },
  {
    title: 'Electric Vibes RD',
    category: 'electrónica',
    city: 'Punta Cana',
    coverImageUrl:
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800',
    images: [
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800',
      'https://images.unsplash.com/photo-1571266028243-d220c6a7f2d4?w=800',
      'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=800',
    ],
    start: () => nextOccurrence(0, 23, 0),
    ticketTypes: [
      { name: 'General', price: 700, quantityTotal: 150 },
      { name: 'VIP All Inclusive', price: 2500, quantityTotal: 15 },
    ],
    tables: [
      { label: 'Mesa VIP-1', zone: 'VIP', capacity: 6, minPrice: 5000, posX: 30, posY: 40 },
      { label: 'Mesa Sky-1', zone: 'Sky Lounge', capacity: 4, minPrice: 4000, posX: 62, posY: 44 },
    ],
  },
];

async function main() {
  await sequelize.authenticate();

  const venue = await ensureVenue();
  const summary = { eventos: [], mesas: 0, tipos: 0 };

  for (const spec of EVENT_SPECS) {
    const existing = await Event.findOne({
      where: { venueId: venue.id, title: spec.title },
    });
    if (existing) {
      if (spec.images?.length) {
        await existing.update({ images: spec.images });
        console.log(`🖼️  Galería actualizada: ${spec.title}`);
      } else {
        console.log(`⏭️  Ya existe: ${spec.title} (omitido)`);
      }
      continue;
    }

    const startAt = spec.start();
    const endAt = eventEnd(startAt, 5);
    const slug = await uniqueEventSlug(venue.id, spec.title);

    const ev = await Event.create({
      venueId: venue.id,
      title: spec.title,
      slug,
      description: `Evento de prueba — ${spec.title}`,
      category: spec.category,
      city: spec.city,
      startAt,
      endAt,
      coverImageUrl: spec.coverImageUrl,
      images: spec.images || null,
      status: 'published',
      featured: true,
    });

    const tts = await EventTicketType.bulkCreate(
      spec.ticketTypes.map((tt) => ({
        eventId: ev.id,
        name: tt.name,
        code: null,
        price: tt.price,
        quantityTotal: tt.quantityTotal,
        soldCount: 0,
        active: true,
      }))
    );
    summary.tipos += tts.length;

    for (const t of spec.tables) {
      await VenueTable.create({
        venueId: venue.id,
        eventId: ev.id,
        zone: t.zone,
        label: t.label,
        capacity: t.capacity,
        minPrice: t.minPrice,
        posX: t.posX,
        posY: t.posY,
        active: true,
      });
      summary.mesas += 1;
    }

    summary.eventos.push({
      titulo: ev.title,
      slug: ev.slug,
      id: ev.id,
      inicio: startAt.toISOString(),
      tipos: spec.ticketTypes.length,
      mesas: spec.tables.length,
    });

    console.log(`✅ Evento creado: ${ev.title} (${ev.slug})`);
  }

  console.log('\n--- Resumen ---');
  console.log(`Venue: ${venue.name} (${venue.id})`);
  if (summary.eventos.length === 0) {
    console.log('No se crearon eventos nuevos (todos existían o lista vacía).');
  } else {
    console.log(`Eventos nuevos: ${summary.eventos.length}`);
    for (const e of summary.eventos) {
      console.log(
        `  · ${e.titulo} | slug: ${e.slug} | tipos: ${e.tipos} | mesas: ${e.mesas} | inicio: ${e.inicio}`
      );
    }
    console.log(`Tipos de entrada creados (total filas): ${summary.tipos}`);
    console.log(`Mesas creadas (total filas): ${summary.mesas}`);
  }

  await sequelize.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
