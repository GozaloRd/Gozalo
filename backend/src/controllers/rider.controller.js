const riderService = require('../services/rider.service');

async function get(req, res) {
  try {
    const data = await riderService.getRider(req.params.eventId);
    return res.json(data);
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }
}

async function update(req, res) {
  try {
    const { riderFiles, setlist, artistNotes, staffWhatsappLink } = req.body;
    const data = await riderService.updateRider(req.params.eventId, req.venueId, {
      riderFiles,
      setlist,
      artistNotes,
      staffWhatsappLink,
    });
    return res.json(data);
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }
}

async function addFile(req, res) {
  try {
    const { fileUrl } = req.body;
    const data = await riderService.addRiderFile(req.params.eventId, req.venueId, fileUrl);
    return res.json({ riderFiles: data });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }
}

async function removeFile(req, res) {
  try {
    const { fileUrl } = req.body;
    const data = await riderService.removeRiderFile(req.params.eventId, req.venueId, fileUrl);
    return res.json({ riderFiles: data });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }
}

module.exports = { get, update, addFile, removeFile };
