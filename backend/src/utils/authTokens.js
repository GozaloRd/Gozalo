const jwt = require('jsonwebtoken');

function signAccessToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret || String(secret).length < 16) {
    throw new Error('JWT_SECRET debe estar definido y tener al menos 16 caracteres');
  }
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
    },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

module.exports = { signAccessToken };
