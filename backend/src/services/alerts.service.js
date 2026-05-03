const { Op } = require('sequelize');
const { Event, Order, Ticket, Reservation, CashClosing, EventTicketType } = require('../models');

/**
 * Calcula las alertas operativas de un local en tiempo real.
 * Reglas:
 *  - evento_en_vivo_lleno: evento en curso con ocupación >= 85% (warn) o >= 95% (danger)
 *  - mesa_sin_cobrar: Order status='open' con tableId y createdAt > 2h
 *  - mesa_sin_cobrar_critico: Order status='open' con tableId y createdAt > 4h (danger)
 *  - caja_pendiente: hay órdenes pagadas desde el último cierre de caja y ese cierre es de hace >12h
 *  - evento_proximo_sin_publicar: evento en <48h con status != published
 *  - evento_proximo_sin_tickets: evento publicado en <7 días sin ticketTypes ni basePrice
 *  - evento_en_vivo_bajo_aforo: evento en curso con ocupación < 30% y han pasado >60min
 */
async function computeVenueAlerts(venueId) {
  const now = Date.now();
  const alerts = [];

  // -------------------------------------------------------------------
  // Eventos próximos + activos
  // -------------------------------------------------------------------
  const upcoming = await Event.findAll({
    where: {
      venueId,
      endAt: { [Op.gte]: new Date(now) },
    },
    include: [{ model: EventTicketType, as: 'ticketTypes', required: false }],
    order: [['startAt', 'ASC']],
    limit: 15,
  });

  const liveEvents = upcoming.filter((e) => {
    const s = new Date(e.startAt).getTime();
    const f = new Date(e.endAt).getTime();
    return s <= now && f >= now;
  });

  // -------------------------------------------------------------------
  // Alertas de aforo sobre eventos EN VIVO
  // -------------------------------------------------------------------
  for (const ev of liveEvents) {
    const capacity = Number(ev.maxCapacity || 0);
    if (!capacity) continue;
    const [paidTickets, partySum] = await Promise.all([
      Ticket.count({
        where: { eventId: ev.id, status: { [Op.in]: ['paid', 'valid', 'used'] } },
      }),
      Reservation.sum('partySize', {
        where: {
          eventId: ev.id,
          status: { [Op.in]: ['confirmed', 'checked_in', 'completed'] },
        },
      }),
    ]);
    const used = Number(paidTickets || 0) + Number(partySum || 0);
    const pct = Math.round((used / capacity) * 100);

    if (pct >= 95) {
      alerts.push({
        id: `aforo-critico-${ev.id}`,
        severity: 'danger',
        category: 'aforo',
        title: `Aforo al ${pct}% en "${ev.title}"`,
        detail: `${used} de ${capacity} plazas ocupadas. Frena nuevas reservas o activa overflow.`,
        href: '/dashboard/reservas',
        context: { eventId: ev.id, pct, used, capacity },
      });
    } else if (pct >= 80) {
      alerts.push({
        id: `aforo-alto-${ev.id}`,
        severity: 'warn',
        category: 'aforo',
        title: `Aforo al ${pct}% en "${ev.title}"`,
        detail: `Quedan ${capacity - used} plazas. Notifica al portero y valora cerrar ventas online.`,
        href: '/dashboard/reservas',
        context: { eventId: ev.id, pct, used, capacity },
      });
    }

    // Evento en vivo con ocupación muy baja tras 60 min desde el inicio
    const minutesIn = (now - new Date(ev.startAt).getTime()) / 60000;
    if (minutesIn > 60 && pct > 0 && pct < 30) {
      alerts.push({
        id: `aforo-bajo-${ev.id}`,
        severity: 'info',
        category: 'aforo',
        title: `"${ev.title}" va al ${pct}%`,
        detail: `Lleva ${Math.round(minutesIn)} min abierto. Considera activar promos flash o notificar a la waitlist.`,
        href: '/dashboard/waitlist',
        context: { eventId: ev.id, pct },
      });
    }
  }

  // -------------------------------------------------------------------
  // Mesas con orden abierta de mucho tiempo
  // -------------------------------------------------------------------
  const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000);
  const fourHoursAgo = new Date(now - 4 * 60 * 60 * 1000);

  const longOpenOrders = await Order.findAll({
    where: {
      venueId,
      status: 'open',
      tableId: { [Op.ne]: null },
      createdAt: { [Op.lt]: twoHoursAgo },
    },
    limit: 50,
  });

  const criticalOrders = longOpenOrders.filter((o) => o.createdAt < fourHoursAgo);
  const warnOrders = longOpenOrders.filter((o) => o.createdAt >= fourHoursAgo);

  if (criticalOrders.length > 0) {
    alerts.push({
      id: 'mesa-larga-critico',
      severity: 'danger',
      category: 'mesa',
      title: `${criticalOrders.length} mesa${criticalOrders.length === 1 ? '' : 's'} con orden abierta >4h`,
      detail: 'Revisa si las mesas se quedaron sin cobrar o si el ticket debería cerrarse.',
      href: '/dashboard/pagos',
      context: { count: criticalOrders.length },
    });
  }
  if (warnOrders.length > 0) {
    alerts.push({
      id: 'mesa-larga',
      severity: 'warn',
      category: 'mesa',
      title: `${warnOrders.length} mesa${warnOrders.length === 1 ? '' : 's'} con orden abierta >2h`,
      detail: 'Ordenes activas más antiguas de lo habitual.',
      href: '/dashboard/pagos',
      context: { count: warnOrders.length },
    });
  }

  // -------------------------------------------------------------------
  // Caja pendiente de cerrar
  // -------------------------------------------------------------------
  const lastClosing = await CashClosing.findOne({
    where: { venueId },
    order: [['createdAt', 'DESC']],
  });
  const sinceDate = lastClosing ? lastClosing.createdAt : new Date(0);
  const twelveHoursAgo = new Date(now - 12 * 60 * 60 * 1000);
  if (!lastClosing || lastClosing.createdAt < twelveHoursAgo) {
    const paidSince = await Order.count({
      where: {
        venueId,
        status: 'paid',
        createdAt: { [Op.gt]: sinceDate },
      },
    });
    if (paidSince > 0) {
      alerts.push({
        id: 'caja-pendiente',
        severity: 'warn',
        category: 'caja',
        title: 'Hay ventas sin cierre de caja',
        detail: `${paidSince} orden${paidSince === 1 ? '' : 'es'} pagada${paidSince === 1 ? '' : 's'} desde el último cierre. Cierra caja para cuadrar turno.`,
        href: '/dashboard/cierre-caja',
        context: { paidSince, lastClosingAt: lastClosing?.createdAt || null },
      });
    }
  }

  // -------------------------------------------------------------------
  // Eventos próximos sin publicar o sin tickets
  // -------------------------------------------------------------------
  const in48h = new Date(now + 48 * 60 * 60 * 1000);
  const in7d = new Date(now + 7 * 24 * 60 * 60 * 1000);

  for (const ev of upcoming) {
    const startMs = new Date(ev.startAt).getTime();
    if (startMs > in7d.getTime()) continue;

    const isPublished = ev.status === 'published' || ev.publicado === true;

    if (!isPublished && startMs <= in48h.getTime()) {
      alerts.push({
        id: `draft-${ev.id}`,
        severity: 'danger',
        category: 'evento',
        title: `"${ev.title}" aún en borrador`,
        detail: `Empieza el ${new Date(ev.startAt).toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}. Publícalo para recibir reservas.`,
        href: `/dashboard/eventos`,
        context: { eventId: ev.id },
      });
      continue;
    }

    const hasTicketTypes = ev.ticketTypes && ev.ticketTypes.length > 0;
    const hasPrice = ev.basePrice && Number(ev.basePrice) > 0;
    if (isPublished && !hasTicketTypes && !hasPrice) {
      alerts.push({
        id: `no-tickets-${ev.id}`,
        severity: 'warn',
        category: 'evento',
        title: `"${ev.title}" sin tipos de entrada`,
        detail: 'Configura al menos un tipo de entrada o un precio base para que los clientes puedan comprar.',
        href: '/dashboard/tickets',
        context: { eventId: ev.id },
      });
    }
  }

  // Ordena: danger > warn > info
  const order = { danger: 0, warn: 1, info: 2 };
  alerts.sort((a, b) => (order[a.severity] ?? 3) - (order[b.severity] ?? 3));

  return {
    data: alerts,
    summary: {
      total: alerts.length,
      danger: alerts.filter((a) => a.severity === 'danger').length,
      warn: alerts.filter((a) => a.severity === 'warn').length,
      info: alerts.filter((a) => a.severity === 'info').length,
    },
    generatedAt: new Date().toISOString(),
  };
}

module.exports = { computeVenueAlerts };
