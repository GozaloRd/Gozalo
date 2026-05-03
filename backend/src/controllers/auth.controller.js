const authService = require('../services/auth.service');

async function register(req, res) {
  try {
    const result = await authService.registerUser(req.body);
    return res.status(201).json(result);
  } catch (error) {
    const status = error.status || 500;
    const message = error.status ? error.message : 'Error al registrar usuario';
    return res.status(status).json({ error: message });
  }
}

async function login(req, res) {
  try {
    const result = await authService.loginUser(req.body);
    return res.json(result);
  } catch (error) {
    const status = error.status || 500;
    const message = error.status ? error.message : 'Error al iniciar sesión';
    return res.status(status).json({ error: message });
  }
}

async function me(req, res) {
  try {
    const result = await authService.getMyProfile(req.user);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: 'Error al cargar perfil' });
  }
}

async function updateMe(req, res) {
  try {
    const result = await authService.updateMyProfile(req.userId, req.body);
    return res.json(result);
  } catch (error) {
    const status = error.status || 500;
    const message = error.status ? error.message : 'Error al actualizar perfil';
    return res.status(status).json({ error: message });
  }
}

module.exports = {
  register,
  login,
  me,
  updateMe,
};
