const { Op } = require('sequelize');

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Rango [start,end] para hoy, esta semana (lun-dom), este mes */
function rangesNow(anchor = new Date()) {
  const todayStart = startOfDay(anchor);
  const todayEnd = endOfDay(anchor);

  const day = anchor.getDay();
  const diffToMonday = (day + 6) % 7;
  const weekStart = startOfDay(addDays(anchor, -diffToMonday));
  const weekEnd = endOfDay(addDays(weekStart, 6));

  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const monthEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59, 999);

  const yesterdayStart = startOfDay(addDays(anchor, -1));
  const yesterdayEnd = endOfDay(addDays(anchor, -1));

  const prevWeekStart = startOfDay(addDays(weekStart, -7));
  const prevWeekEnd = endOfDay(addDays(weekEnd, -7));

  const prevMonthStart = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1);
  const prevMonthEnd = new Date(anchor.getFullYear(), anchor.getMonth(), 0, 23, 59, 59, 999);

  return {
    today: { start: todayStart, end: todayEnd },
    week: { start: weekStart, end: weekEnd },
    month: { start: monthStart, end: monthEnd },
    prevToday: { start: yesterdayStart, end: yesterdayEnd },
    prevWeek: { start: prevWeekStart, end: prevWeekEnd },
    prevMonth: { start: prevMonthStart, end: prevMonthEnd },
  };
}

/**
 * Panel Ventas (móvil): HOY, últimos 7 días calendario (hoy incluido), mes natural,
 * y ventanas de comparación para tendencias.
 */
function rangesSalesPanelMobile(anchor = new Date()) {
  const todayStart = startOfDay(anchor);
  const todayEnd = endOfDay(anchor);

  const yesterdayStart = startOfDay(addDays(anchor, -1));
  const yesterdayEnd = endOfDay(addDays(anchor, -1));

  const week7Start = startOfDay(addDays(anchor, -6));
  const week7End = endOfDay(anchor);
  const prevWeek7Start = startOfDay(addDays(anchor, -13));
  const prevWeek7End = endOfDay(addDays(anchor, -7));

  /* "Mes" del panel móvil = últimos 30 días (rolling window). */
  const monthStart = startOfDay(addDays(anchor, -29));
  const monthEnd = endOfDay(anchor);
  const prevMonthStart = startOfDay(addDays(anchor, -59));
  const prevMonthEnd = endOfDay(addDays(anchor, -30));

  return {
    today: { start: todayStart, end: todayEnd },
    prevToday: { start: yesterdayStart, end: yesterdayEnd },
    week7: { start: week7Start, end: week7End },
    prevWeek7: { start: prevWeek7Start, end: prevWeek7End },
    month: { start: monthStart, end: monthEnd },
    prevMonth: { start: prevMonthStart, end: prevMonthEnd },
  };
}

function pctChange(current, previous) {
  const c = Number(current) || 0;
  const p = Number(previous) || 0;
  if (p === 0) return c > 0 ? 100 : 0;
  return Number((((c - p) / p) * 100).toFixed(2));
}

function parsePage(req) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

const RES_STATUS_ALIASES = {
  pendiente: 'pending',
  confirmada: 'confirmed',
  checked_in: 'checked_in',
  completada: 'completed',
  cancelada: 'cancelled',
  no_show: 'no_show',
};

function normalizeReservationStatus(raw) {
  if (!raw) return null;
  const s = String(raw).toLowerCase();
  return RES_STATUS_ALIASES[s] || s;
}

const TICKET_STATUS_ALIASES = {
  pendiente: 'pending',
  pagado: 'paid',
  valido: 'valid',
  usado: 'used',
  cancelado: 'cancelled',
};

function normalizeTicketStatus(raw) {
  if (!raw) return null;
  const s = String(raw).toLowerCase();
  return TICKET_STATUS_ALIASES[s] || s;
}

/** Para filtros WHERE: pagado incluye tickets vendidos y/o ya usados. */
function ticketStatusWhere(status) {
  if (!status) return null;
  if (status === 'paid' || status === 'pagado') {
    return { [Op.in]: ['paid', 'valid', 'used'] };
  }
  return status;
}

module.exports = {
  startOfDay,
  endOfDay,
  addDays,
  rangesNow,
  rangesSalesPanelMobile,
  pctChange,
  parsePage,
  normalizeReservationStatus,
  normalizeTicketStatus,
  ticketStatusWhere,
};
