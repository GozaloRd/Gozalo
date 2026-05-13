const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { signAccessToken } = require('../utils/authTokens');
const { sendWelcome } = require('./emailService');

function toUserPayload(user) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    points: user.points,
  };
}

function toMePayload(user) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    city: user.city ?? null,
    country: user.country ?? null,
    role: user.role,
    points: user.points,
    avatarUrl: user.avatarUrl,
  };
}

async function registerUser({ email, password, fullName, phone, role, city, country }) {
  const exists = await User.findOne({ where: { email } });
  if (exists) {
    const err = new Error('El correo ya está registrado');
    err.status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const allowedRoles = ['customer', 'venue_owner'];
  const cityTrim = city != null && String(city).trim() ? String(city).trim() : null;
  const countryTrim = country != null && String(country).trim() ? String(country).trim() : null;
  const user = await User.create({
    email,
    passwordHash,
    fullName,
    phone: phone || null,
    city: cityTrim,
    country: countryTrim,
    role: allowedRoles.includes(role) ? role : 'customer',
  });

  await sendWelcome(email, fullName).catch(() => {});

  const token = signAccessToken(user);
  return { token, user: toUserPayload(user) };
}

async function loginUser({ email, password }) {
  const user = await User.findOne({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    const err = new Error('Credenciales inválidas');
    err.status = 401;
    throw err;
  }

  const token = signAccessToken(user);
  return { token, user: toUserPayload(user) };
}

async function getMyProfile(user) {
  return toMePayload(user);
}

async function updateMyProfile(userId, { fullName, phone, avatarUrl, city, country }) {
  const user = await User.findByPk(userId);
  if (!user) {
    const err = new Error('No encontrado');
    err.status = 404;
    throw err;
  }

  if (fullName != null && String(fullName).trim()) {
    user.fullName = String(fullName).trim();
  }
  if (phone !== undefined) user.phone = phone || null;
  if (avatarUrl !== undefined) user.avatarUrl = avatarUrl || null;
  if (city !== undefined) user.city = city != null && String(city).trim() ? String(city).trim() : null;
  if (country !== undefined)
    user.country = country != null && String(country).trim() ? String(country).trim() : null;

  await user.save();
  return toMePayload(user);
}

module.exports = {
  registerUser,
  loginUser,
  getMyProfile,
  updateMyProfile,
};
