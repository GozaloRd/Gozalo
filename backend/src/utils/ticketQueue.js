'use strict';

const { Op, fn, col } = require('sequelize');

/**
 * Cuenta tickets vendidos por etiqueta `ticketType` (nombre, id o code del tipo).
 * @returns {Map<string, number>}
 */
async function soldCountsByLabelForEvent(Ticket, eventId) {
  const rows = await Ticket.findAll({
    attributes: ['ticketType', [fn('COUNT', col('Ticket.id')), 'soldQty']],
    where: {
      eventId,
      status: { [Op.in]: ['paid', 'valid', 'used'] },
    },
    group: ['ticketType'],
    raw: true,
  });
  const m = new Map();
  for (const r of rows) {
    m.set(String(r.ticketType), Number(r.soldQty) || 0);
  }
  return m;
}

function soldForType(soldMap, tt) {
  const keys = [tt.id, tt.name, tt.code].filter((x) => x != null && String(x).length > 0).map((x) => String(x));
  for (const k of keys) {
    const v = soldMap.get(k);
    if (v !== undefined) return v;
  }
  return Number(tt.soldCount) || 0;
}

function isSoldOut(tt, sold) {
  const cap = tt.quantityTotal;
  if (cap == null || cap <= 0) return false;
  return sold >= cap;
}

/**
 * Orden de venta en modo secuencial: `sort_order` ASC, luego creación.
 */
function orderedTypes(types) {
  return [...types].sort((a, b) => {
    const sa = Number(a.sortOrder ?? a.sort_order ?? 0);
    const sb = Number(b.sortOrder ?? b.sort_order ?? 0);
    if (sa !== sb) return sa - sb;
    const ta = new Date(a.createdAt ?? 0).getTime();
    const tb = new Date(b.createdAt ?? 0).getTime();
    return ta - tb;
  });
}

/**
 * Primer tipo en cola que aún acepta ventas (activo, no agotado). Modo secuencial.
 */
function currentSequentialSellableType(types, soldMap) {
  const list = orderedTypes(types).filter((t) => t.active !== false);
  for (const tt of list) {
    const sold = soldForType(soldMap, tt);
    if (!isSoldOut(tt, sold)) return tt;
  }
  return null;
}

/**
 * Valida compra contra modo parallel | sequential.
 */
function bumpPendingSold(soldMap, tt, qty) {
  const keys = [tt.id, tt.name, tt.code].filter((x) => x != null && String(x).length > 0).map((x) => String(x));
  const n = Number(qty) || 0;
  for (const k of keys) {
    soldMap.set(k, (soldMap.get(k) || 0) + n);
  }
}

async function assertPurchaseTicketLinesAllowed({ Ticket, EventTicketType, event, items }) {
  const types = await EventTicketType.findAll({ where: { eventId: event.id } });
  const soldMap = await soldCountsByLabelForEvent(Ticket, event.id);
  const mode = String(event.ticketSaleMode || event.ticket_sale_mode || 'parallel').toLowerCase();

  for (const line of items) {
    const label = String(line.ticketType);
    const tt = types.find((t) => String(t.name) === label || String(t.id) === label || (t.code && String(t.code) === label));
    if (!tt) {
      const err = new Error('Tipo de entrada no válido');
      err.status = 400;
      throw err;
    }
    if (tt.active === false) {
      const err = new Error('Este tipo de entrada no está a la venta');
      err.status = 400;
      throw err;
    }
    const sold = soldForType(soldMap, tt);
    const cap = tt.quantityTotal;
    const qty = Number(line.quantity || 0);
    if (cap != null && cap > 0 && sold + qty > cap) {
      const err = new Error('No hay suficientes entradas disponibles para este tipo');
      err.status = 400;
      throw err;
    }
    if (mode === 'sequential') {
      const current = currentSequentialSellableType(types, soldMap);
      if (!current || String(current.id) !== String(tt.id)) {
        const err = new Error(
          'Este tipo de entrada aún no está a la venta. Se activará cuando se agote la oleada anterior.'
        );
        err.status = 400;
        throw err;
      }
    }
    bumpPendingSold(soldMap, tt, qty);
  }
}

module.exports = {
  soldCountsByLabelForEvent,
  soldForType,
  isSoldOut,
  orderedTypes,
  currentSequentialSellableType,
  assertPurchaseTicketLinesAllowed,
};
