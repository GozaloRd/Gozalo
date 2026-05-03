const resaleService = require('../services/resale.service');

async function listEventResales(req, res) {
  try {
    const data = await resaleService.listEventResales(req.params.eventId);
    return res.json({ data });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }
}

async function myListings(req, res) {
  try {
    const data = await resaleService.myListings(req.userId);
    return res.json({ data });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }
}

async function myPurchases(req, res) {
  try {
    const data = await resaleService.myPurchases(req.userId);
    return res.json({ data });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }
}

async function listForResale(req, res) {
  try {
    // askPrice ya no se acepta — el precio se toma del ticket original
    const { ticketId } = req.body;
    const data = await resaleService.listForResale({ ticketId, sellerUserId: req.userId });
    return res.status(201).json(data);
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }
}

async function cancelListing(req, res) {
  try {
    const data = await resaleService.cancelListing({ resaleId: req.params.id, sellerUserId: req.userId });
    return res.json(data);
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }
}

async function claimResale(req, res) {
  try {
    const data = await resaleService.claimResale({ resaleId: req.params.id, buyerUserId: req.userId });
    return res.status(201).json(data);
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }
}

/** Dashboard: listar reventas con pago pendiente al vendedor */
async function listPendingPayouts(req, res) {
  try {
    const data = await resaleService.listPendingPayouts({ venueId: req.venueId });
    return res.json({ data });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }
}

/** Dashboard: marcar pago al vendedor como realizado */
async function markSellerPaid(req, res) {
  try {
    const data = await resaleService.markSellerPaid({ resaleId: req.params.id });
    return res.json(data);
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }
}

module.exports = {
  listEventResales,
  myListings,
  myPurchases,
  listForResale,
  cancelListing,
  claimResale,
  listPendingPayouts,
  markSellerPaid,
};
