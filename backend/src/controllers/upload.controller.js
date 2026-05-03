const upload = require('../middleware/upload');
const uploadService = require('../services/upload.service');

function uploadSingle(req, res) {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Error al subir' });
    if (!req.file) return res.status(400).json({ error: 'No se subió ninguna imagen' });
    return res.json(uploadService.buildSingleImageResponse(req.file));
  });
}

function uploadMultiple(req, res) {
  upload.array('images', 10)(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Error al subir' });
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No se subieron imágenes' });
    return res.json(uploadService.buildMultiImagesResponse(req.files));
  });
}

module.exports = {
  uploadSingle,
  uploadMultiple,
};
