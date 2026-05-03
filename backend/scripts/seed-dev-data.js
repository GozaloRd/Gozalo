/**
 * Datos de prueba para desarrollo: dueño, local aprobado, mesas, eventos, productos, tipos de entrada.
 * Requiere NODE_ENV=development y DB configurada.
 *
 * Variables opcionales en backend/.env:
 *   SEED_DEV_OWNER_EMAIL=dev-owner@gozalo.local
 *   SEED_DEV_OWNER_PASSWORD=devowner123
 *
 * Uso: npm run seed:dev
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
  Product,
  EventTicketType,
  VenueStaff,
} = require('../src/models');

function slugify(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function addHours(d, h) {
  const x = new Date(d);
  x.setHours(x.getHours() + h);
  return x;
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('seed:dev solo en desarrollo.');
    process.exit(1);
  }

  const email = (process.env.SEED_DEV_OWNER_EMAIL || 'dev-owner@gozalo.local').trim().toLowerCase();
  const password = process.env.SEED_DEV_OWNER_PASSWORD || 'devowner123';
  if (password.length < 6) {
    console.error('SEED_DEV_OWNER_PASSWORD debe tener al menos 6 caracteres');
    process.exit(1);
  }

  await sequelize.authenticate();
  const hash = await bcrypt.hash(password, 10);

  const [owner] = await User.findOrCreate({
    where: { email },
    defaults: {
      email,
      passwordHash: hash,
      fullName: 'Dueño Demo Gózalo',
      role: 'venue_owner',
    },
  });
  if (owner.role !== 'venue_owner') {
    owner.role = 'venue_owner';
    owner.passwordHash = hash;
    await owner.save();
  }

  let venue = await Venue.findOne({ where: { ownerId: owner.id } });
  if (!venue) {
    const base = 'gozalo-demo';
    let slug = base;
    let n = 1;
    while (await Venue.findOne({ where: { slug } })) {
      slug = `${base}-${n++}`;
    }
    venue = await Venue.create({
      ownerId: owner.id,
      name: 'Gózalo Club Demo',
      slug,
      description: 'Local de prueba — eventos, reservas y POS.',
      city: 'Santo Domingo',
      address: 'Zona Colonial (demo)',
      capacity: 400,
      status: 'approved',
    });
    console.log('Venue creado:', venue.name, venue.id);
  } else {
    console.log('Venue existente:', venue.name, venue.id);
  }

  const tCount = await VenueTable.count({ where: { venueId: venue.id } });
  const zones = ['VIP', 'VIP', 'Terraza', 'Terraza', 'General'];
  for (let i = tCount; i < 5; i++) {
    await VenueTable.create({
      venueId: venue.id,
      eventId: null,
      zone: zones[i],
      label: `M${i + 1}`,
      capacity: i < 2 ? 6 : 4,
      minPrice: i < 2 ? 1500 : 800,
      posX: i * 40,
      posY: i * 20,
      active: true,
    });
  }
  console.log('Mesas: al menos 5 en el venue');

  const now = new Date();
  let ev1 = await Event.findOne({
    where: { venueId: venue.id, slug: 'noche-electronica-demo' },
  });
  if (!ev1) {
    ev1 = await Event.create({
      venueId: venue.id,
      title: 'Noche Electrónica — Demo en vivo',
      slug: 'noche-electronica-demo',
      description: 'Evento activo para pruebas de ocupación y tickets.',
      category: 'electrónica',
      city: venue.city,
      startAt: addHours(now, -2),
      endAt: addHours(now, 10),
      status: 'published',
      featured: true,
    });
    console.log('Evento 1 (activo):', ev1.title);
  }

  let ev2 = await Event.findOne({
    where: { venueId: venue.id, slug: 'reggaeton-night-demo' },
  });
  if (!ev2) {
    ev2 = await Event.create({
      venueId: venue.id,
      title: 'Reggaeton Night',
      slug: 'reggaeton-night-demo',
      description: 'Segundo evento publicado (fecha futura).',
      category: 'reggaeton',
      city: venue.city,
      startAt: addHours(now, 24 * 7),
      endAt: addHours(now, 24 * 7 + 5),
      status: 'published',
      featured: false,
    });
    console.log('Evento 2:', ev2.title);
  }

  const tt1 = await EventTicketType.count({ where: { eventId: ev1.id } });
  if (tt1 === 0) {
    await EventTicketType.bulkCreate([
      {
        eventId: ev1.id,
        name: 'General',
        code: 'GEN',
        price: 500,
        quantityTotal: 200,
        soldCount: 12,
        active: true,
      },
      {
        eventId: ev1.id,
        name: 'VIP',
        code: 'VIP',
        price: 1200,
        quantityTotal: 50,
        soldCount: 5,
        active: true,
      },
    ]);
    console.log('Tipos de entrada para evento 1');
  }

  const products = [
    { name: 'Cerveza importada', category: 'bebidas', price: 250 },
    { name: 'Mojito', category: 'cocteles', price: 350 },
    { name: 'Botella ron premium', category: 'botellas', price: 3500 },
    { name: 'Agua', category: 'bebidas', price: 100 },
  ];
  for (const p of products) {
    const exists = await Product.findOne({
      where: { venueId: venue.id, name: p.name },
    });
    if (!exists) {
      await Product.create({
        venueId: venue.id,
        name: p.name,
        category: p.category,
        price: p.price,
        active: true,
      });
    }
  }
  console.log('Productos de bar verificados/creados');

  const staffEmail = 'staff-demo@gozalo.local';
  const [staffUser] = await User.findOrCreate({
    where: { email: staffEmail },
    defaults: {
      email: staffEmail,
      passwordHash: await bcrypt.hash('staffdemo123', 10),
      fullName: 'Camarero Demo',
      role: 'staff',
    },
  });

  const vs = await VenueStaff.findOne({
    where: { venueId: venue.id, userId: staffUser.id },
  });
  if (!vs) {
    await VenueStaff.create({
      venueId: venue.id,
      userId: staffUser.id,
      staffRole: 'waiter',
      commissionPercent: 5,
      active: true,
    });
    console.log('Staff demo vinculado al local');
  }

  console.log('\n✓ Seed desarrollo listo.');
  console.log(`  Dueño: ${email} / ${password}`);
  console.log(`  Staff: ${staffEmail} / staffdemo123`);
  console.log(`  Venue ID: ${venue.id}`);
  await sequelize.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
