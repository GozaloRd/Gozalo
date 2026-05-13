const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { User } = require('../models');

/**
 * Busca o crea un usuario cliente por email (compra/reserva web sin sesión).
 * @param {'tickets' | 'reservation'} context — mensaje de error si el email falta o es inválido
 */
async function findOrCreateCustomerByEmail(emailRaw, fullNameRaw, context = 'tickets') {
  const email = String(emailRaw || '')
    .trim()
    .toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const err = new Error(
      context === 'reservation'
        ? 'Indica un correo electrónico válido para tu reserva.'
        : 'Indica un correo electrónico válido para recibir tus entradas.'
    );
    err.status = 400;
    throw err;
  }
  const fullName = String(fullNameRaw || '')
    .trim()
    .slice(0, 160);
  let user = await User.findOne({ where: { email } });
  if (user) return user.id;
  const placeholder = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);
  try {
    user = await User.create({
      email,
      passwordHash: placeholder,
      fullName: fullName || 'Cliente',
      role: 'customer',
    });
    return user.id;
  } catch (e) {
    if (e?.name === 'SequelizeUniqueConstraintError') {
      user = await User.findOne({ where: { email } });
      if (user) return user.id;
    }
    const err = new Error('No se pudo registrar el comprador.');
    err.status = 400;
    throw err;
  }
}

module.exports = { findOrCreateCustomerByEmail };
