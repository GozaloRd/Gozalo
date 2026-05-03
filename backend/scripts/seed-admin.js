/**
 * Crea o actualiza un usuario administrador de la plataforma (rol admin).
 * En backend/.env define:
 *   SEED_ADMIN_EMAIL
 *   SEED_ADMIN_PASSWORD
 *   SEED_ADMIN_NAME (opcional)
 *
 * Uso: npm run seed:admin
 */
const path = require('path');
require('dotenv').config({
  path: path.join(__dirname, '..', '.env'),
  override: true,
});

const bcrypt = require('bcryptjs');
const { sequelize, User } = require('../src/models');

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@gozalo.local').trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD != null
    ? String(process.env.SEED_ADMIN_PASSWORD).trim()
    : '';
  const fullName = (process.env.SEED_ADMIN_NAME || 'Administrador Gózalo').trim();

  if (!password || password.length < 6) {
    console.error(
      'Define SEED_ADMIN_PASSWORD en backend/.env (mínimo 6 caracteres) antes de npm run seed:admin'
    );
    process.exit(1);
  }

  await sequelize.authenticate();
  const hash = await bcrypt.hash(password, 10);
  const [user, created] = await User.findOrCreate({
    where: { email },
    defaults: {
      email,
      passwordHash: hash,
      fullName,
      role: 'admin',
    },
  });

  if (!created) {
    user.passwordHash = hash;
    user.role = 'admin';
    if (fullName) user.fullName = fullName;
    await user.save();
    console.log(`Usuario existente actualizado a admin: ${email}`);
  } else {
    console.log(`Usuario admin creado: ${email}`);
  }
  console.log(
    'Inicia sesión con ese correo y contraseña. Los administradores de plataforma usan /api/admin y suelen indicar venueId al gestionar un local concreto.'
  );
  await sequelize.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
