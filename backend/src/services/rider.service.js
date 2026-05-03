const { Event } = require('../models');

/**
 * Obtiene el rider técnico y setlist de un evento.
 * Acceso público (para que el local comparta con el equipo técnico).
 */
async function getRider(eventId) {
  const ev = await Event.findByPk(eventId, {
    attributes: ['id', 'title', 'startAt', 'riderFiles', 'setlist', 'artistNotes', 'staffWhatsappLink'],
  });
  if (!ev) {
    const err = new Error('Evento no encontrado');
    err.status = 404;
    throw err;
  }
  return ev;
}

/**
 * Actualiza el rider técnico y/o el setlist del evento.
 * Solo accesible desde el dashboard del local (requireVenueAccess).
 */
async function updateRider(eventId, venueId, { riderFiles, setlist, artistNotes, staffWhatsappLink }) {
  const ev = await Event.findOne({ where: { id: eventId, venueId } });
  if (!ev) {
    const err = new Error('Evento no encontrado para este local');
    err.status = 404;
    throw err;
  }

  const updates = {};
  if (riderFiles !== undefined) updates.riderFiles = riderFiles;
  if (setlist !== undefined) updates.setlist = setlist;
  if (artistNotes !== undefined) updates.artistNotes = artistNotes;
  if (staffWhatsappLink !== undefined) updates.staffWhatsappLink = staffWhatsappLink;

  await ev.update(updates);
  return {
    id: ev.id,
    title: ev.title,
    riderFiles: ev.riderFiles,
    setlist: ev.setlist,
    artistNotes: ev.artistNotes,
    staffWhatsappLink: ev.staffWhatsappLink,
  };
}

/**
 * Añade una URL al array de archivos del rider (acumula sin reemplazar).
 */
async function addRiderFile(eventId, venueId, fileUrl) {
  const ev = await Event.findOne({ where: { id: eventId, venueId } });
  if (!ev) {
    const err = new Error('Evento no encontrado para este local');
    err.status = 404;
    throw err;
  }
  const current = Array.isArray(ev.riderFiles) ? ev.riderFiles : [];
  await ev.update({ riderFiles: [...current, fileUrl] });
  return ev.riderFiles;
}

/**
 * Elimina una URL concreta del rider.
 */
async function removeRiderFile(eventId, venueId, fileUrl) {
  const ev = await Event.findOne({ where: { id: eventId, venueId } });
  if (!ev) {
    const err = new Error('Evento no encontrado para este local');
    err.status = 404;
    throw err;
  }
  const current = Array.isArray(ev.riderFiles) ? ev.riderFiles : [];
  await ev.update({ riderFiles: current.filter((f) => f !== fileUrl) });
  return ev.riderFiles;
}

module.exports = { getRider, updateRider, addRiderFile, removeRiderFile };
