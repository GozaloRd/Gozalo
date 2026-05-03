/**
 * ⚠️ ARCHIVO LEGACY - NO USAR
 *
 * Este archivo fue reemplazado por:
 * - routes/upload.routes.js
 */
const express = require('express');
const upload = require('../middleware/upload');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const baseUrl = () => process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 4000}`;

router.post('/image', authenticate, (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Error al subir' });
    }
    next();
  });
}, (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      error: 'No se subió ninguna imagen',
    });
  }
  const imageUrl = `${baseUrl()}/uploads/${req.file.filename}`;
  res.json({
    success: true,
    url: imageUrl,
    filename: req.file.filename,
  });
});

router.post('/images', authenticate, (req, res, next) => {
  upload.array('images', 10)(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Error al subir' });
    }
    next();
  });
}, (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      error: 'No se subieron imágenes',
    });
  }
  const urls = req.files.map((file) => `${baseUrl()}/uploads/${file.filename}`);
  res.json({
    success: true,
    urls,
    count: urls.length,
  });
});

module.exports = router;
