const { Op } = require('sequelize');
const { Event, Ticket, Reservation } = require('../models');

/**
 * Forecast de ingresos por evento — heurística sobre histórico del propio local.
 *
 * Entradas:
 *   - eventId (target)
 * Proceso:
 *   1. Toma el evento objetivo y obtiene día de semana, categoría y si está destacado.
 *   2. Busca eventos PASADOS del mismo local (últimos 180 días).
 *   3. Segmenta los históricos:
 *        - mismo día de la semana (peso 1.0)
 *        - otro día (peso 0.4)
 *        - misma categoría (+0.25 peso bonus)
 *   4. Calcula ingresos reales pasados (tickets.unitPrice × count + reservations.totalAmount).
 *   5. Media ponderada + ajustes (fin de semana, destacado).
 *   6. Retorna estimación con rango de confianza y lista de "factores" explicativos.
 */

function dayOfWeek(iso) {
  return new Date(iso).getDay(); // 0..6 (0 = domingo)
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

async function sumEventRevenue(eventId) {
  const [tickets, reservationsTotal] = await Promise.all([
    Ticket.sum('unitPrice', {
      where: {
        eventId,
        status: { [Op.in]: ['paid', 'valid', 'used'] },
      },
    }),
    Reservation.sum('totalAmount', {
      where: {
        eventId,
        status: { [Op.in]: ['confirmed', 'checked_in', 'completed'] },
      },
    }),
  ]);
  return Number(tickets || 0) + Number(reservationsTotal || 0);
}

async function countEventAttendance(eventId) {
  const [tickets, partySum] = await Promise.all([
    Ticket.count({
      where: { eventId, status: { [Op.in]: ['paid', 'valid', 'used'] } },
    }),
    Reservation.sum('partySize', {
      where: {
        eventId,
        status: { [Op.in]: ['confirmed', 'checked_in', 'completed'] },
      },
    }),
  ]);
  return Number(tickets || 0) + Number(partySum || 0);
}

async function computeEventForecast({ eventId }) {
  const target = await Event.findByPk(eventId);
  if (!target) {
    const err = new Error('Evento no encontrado');
    err.status = 404;
    throw err;
  }

  const targetDow = dayOfWeek(target.startAt);
  const targetCategory = target.category;
  const now = Date.now();
  const cutoff = new Date(now - 180 * 24 * 60 * 60 * 1000);

  // Eventos pasados del mismo local en los últimos 180 días
  const pastEvents = await Event.findAll({
    where: {
      venueId: target.venueId,
      endAt: { [Op.lt]: new Date(now), [Op.gte]: cutoff },
      id: { [Op.ne]: target.id },
    },
    order: [['endAt', 'DESC']],
    limit: 40,
  });

  if (pastEvents.length === 0) {
    return {
      eventId: target.id,
      eventTitle: target.title,
      hasEnoughData: false,
      forecast: null,
      confidenceLow: null,
      confidenceHigh: null,
      basedOn: 0,
      message: 'Aún no hay historia suficiente para predecir. Al menos 3 eventos pasados dan señal.',
      factors: [],
    };
  }

  // Recolectar stats por evento histórico
  const stats = await Promise.all(
    pastEvents.map(async (ev) => {
      const [revenue, attendance] = await Promise.all([
        sumEventRevenue(ev.id),
        countEventAttendance(ev.id),
      ]);
      return {
        id: ev.id,
        title: ev.title,
        dow: dayOfWeek(ev.startAt),
        category: ev.category,
        daysAgo: Math.max(1, Math.round((now - new Date(ev.endAt).getTime()) / 86400000)),
        revenue,
        attendance,
      };
    })
  );

  // Filtrar eventos con 0 ingresos (probablemente test/cancelados)
  const withRevenue = stats.filter((s) => s.revenue > 0);

  if (withRevenue.length < 3) {
    // Sample pequeño → media simple + factor de decaimiento
    const avg = withRevenue.length > 0
      ? withRevenue.reduce((a, s) => a + s.revenue, 0) / withRevenue.length
      : 0;
    return {
      eventId: target.id,
      eventTitle: target.title,
      hasEnoughData: false,
      forecast: Math.round(avg),
      confidenceLow: Math.round(avg * 0.6),
      confidenceHigh: Math.round(avg * 1.4),
      basedOn: withRevenue.length,
      message: `Sólo ${withRevenue.length} eventos pasados con ingresos. La predicción es aproximada.`,
      factors: [
        { label: 'Pocos datos', impact: 'warn', detail: `Base: ${withRevenue.length} eventos pasados` },
      ],
    };
  }

  // Pesos por evento histórico
  let totalWeight = 0;
  let weightedSum = 0;
  let attendanceWeightedSum = 0;
  for (const s of withRevenue) {
    const dowWeight = s.dow === targetDow ? 1.0 : 0.4;
    const categoryBonus = s.category === targetCategory ? 0.25 : 0;
    // Decaimiento temporal: eventos muy antiguos valen menos (0.5 a 180d, 1.0 en últimos 30d)
    const recency = clamp(1 - (s.daysAgo - 30) / 300, 0.5, 1.0);
    const w = (dowWeight + categoryBonus) * recency;
    totalWeight += w;
    weightedSum += s.revenue * w;
    attendanceWeightedSum += s.attendance * w;
  }

  let forecast = weightedSum / totalWeight;
  const avgAttendance = Math.round(attendanceWeightedSum / totalWeight);

  // Factores contextuales
  const factors = [];

  // Día de semana del target
  const dowNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const matchingDowCount = withRevenue.filter((s) => s.dow === targetDow).length;
  if (matchingDowCount >= 3) {
    factors.push({
      label: `Histórico del ${dowNames[targetDow]}`,
      impact: 'positive',
      detail: `${matchingDowCount} eventos pasados del mismo día de la semana`,
    });
  }

  // Bonus por fin de semana (vie/sáb)
  if (targetDow === 5 || targetDow === 6) {
    forecast *= 1.1;
    factors.push({
      label: 'Fin de semana',
      impact: 'positive',
      detail: '+10% por ser viernes o sábado',
    });
  }

  // Bonus por evento destacado
  if (target.featured || target.destacado) {
    forecast *= 1.15;
    factors.push({
      label: 'Evento destacado',
      impact: 'positive',
      detail: '+15% por estar marcado como destacado',
    });
  }

  // Categoría
  const sameCategoryCount = withRevenue.filter((s) => s.category === targetCategory).length;
  if (sameCategoryCount >= 3) {
    factors.push({
      label: `Categoría "${targetCategory}"`,
      impact: 'positive',
      detail: `${sameCategoryCount} eventos pasados de la misma categoría`,
    });
  }

  // Tendencia reciente (últimos 3 vs 3 anteriores)
  const sorted = [...withRevenue].sort((a, b) => a.daysAgo - b.daysAgo);
  const recent3 = sorted.slice(0, 3);
  const prev3 = sorted.slice(3, 6);
  if (recent3.length === 3 && prev3.length === 3) {
    const recentAvg = recent3.reduce((a, s) => a + s.revenue, 0) / 3;
    const prevAvg = prev3.reduce((a, s) => a + s.revenue, 0) / 3;
    const trend = prevAvg > 0 ? (recentAvg - prevAvg) / prevAvg : 0;
    if (trend > 0.1) {
      forecast *= 1 + Math.min(0.15, trend * 0.5);
      factors.push({
        label: 'Tendencia al alza',
        impact: 'positive',
        detail: `Últimos 3 eventos ${Math.round(trend * 100)}% sobre la media previa`,
      });
    } else if (trend < -0.1) {
      forecast *= 1 + Math.max(-0.15, trend * 0.5);
      factors.push({
        label: 'Tendencia a la baja',
        impact: 'negative',
        detail: `Últimos 3 eventos ${Math.round(trend * 100)}% vs la media previa`,
      });
    }
  }

  // Confianza: el error aumenta si hay poca data del mismo día de la semana
  const confidenceFactor = matchingDowCount >= 5 ? 0.15 : matchingDowCount >= 3 ? 0.2 : 0.3;
  const forecastRounded = Math.round(forecast);

  return {
    eventId: target.id,
    eventTitle: target.title,
    hasEnoughData: true,
    forecast: forecastRounded,
    confidenceLow: Math.round(forecast * (1 - confidenceFactor)),
    confidenceHigh: Math.round(forecast * (1 + confidenceFactor)),
    expectedAttendance: avgAttendance,
    basedOn: withRevenue.length,
    dayOfWeek: dowNames[targetDow],
    factors,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = { computeEventForecast };
