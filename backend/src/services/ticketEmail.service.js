const path = require('path');
const { Resend } = require('resend');

const { Order, Ticket, Event, Venue, User } = require('../models');
const { generateQrPngBuffer } = require('./qrService');

require('dotenv').config({
  path: path.join(__dirname, '..', '..', '.env'),
  override: true,
});

function escapeHtml(s) {
  if (s == null || s === '') return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDateTime(iso) {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('es-DO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Santo_Domingo',
    }).format(d);
  } catch {
    return '';
  }
}

function qrExternalUrl(code) {
  return `https://quickchart.io/qr?text=${encodeURIComponent(code)}&size=280&margin=1&format=png&dark=ffffff&light=0a0a12`;
}

async function persistSendError(orderId, errMsg) {
  await Order.update(
    { ticketEmailSendError: String(errMsg || 'unknown_error').slice(0, 4000) },
    { where: { id: orderId } }
  );
}

async function persistSuccess(orderId) {
  await Order.update(
    {
      ticketEmailSentAt: new Date(),
      ticketEmailSendError: null,
    },
    { where: { id: orderId, ticketEmailSentAt: null } }
  );
}

/**
 * Envía correo de confirmación de entradas vía Resend tras el pago.
 * Dedupe por `ticketEmailSentAt`. Los fallos solo actualizan `ticketEmailSendError`.
 *
 * @param {import('sequelize').Model & { id: string }} order Orden (al menos `{ id }`); se recarga con tickets/evento/usuario.
 * @returns {Promise<{ skipped?: boolean, reason?: string, sent?: boolean, error?: string, resendId?: string }>}
 */
async function sendTicketEmail(order) {
  const orderId = order?.id ?? order;
  if (!orderId) {
    return { skipped: true, reason: 'invalid_order' };
  }

  const loaded = await Order.findByPk(orderId, {
    include: [
      {
        model: Event,
        as: 'event',
        required: false,
        include: [{ model: Venue, as: 'venue' }],
      },
      {
        model: User,
        as: 'user',
        required: false,
        attributes: ['id', 'email', 'fullName'],
      },
      { model: Ticket, as: 'tickets', required: false },
    ],
  });

  if (!loaded) return { skipped: true, reason: 'order_not_found' };
  if (loaded.type !== 'tickets') return { skipped: true, reason: 'wrong_order_type' };
  if (loaded.status !== 'paid') return { skipped: true, reason: 'order_not_paid' };
  if (loaded.ticketEmailSentAt) return { skipped: true, reason: 'already_sent' };

  const emailTo = loaded.user?.email?.trim();
  if (!emailTo) {
    await persistSendError(orderId, 'Comprador sin email en cuenta');
    return { skipped: true, reason: 'no_email' };
  }

  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) {
    await persistSendError(orderId, 'RESEND_API_KEY no configurado');
    console.warn('[ticketEmail] RESEND_API_KEY ausente — order', orderId);
    return { skipped: true, reason: 'no_resend_key' };
  }

  const event = loaded.event;
  if (!event) {
    await persistSendError(orderId, 'Evento no encontrado para esta orden');
    return { skipped: true, reason: 'no_event' };
  }

  const tickets = [...(loaded.tickets || [])].sort((a, b) =>
    String(a.createdAt || '').localeCompare(String(b.createdAt || ''))
  );
  const qty = tickets.length;
  if (!qty) {
    await persistSendError(orderId, 'La orden no tiene tickets asociados');
    return { skipped: true, reason: 'no_tickets' };
  }

  const venue = event.venue;
  const lugarTxt = [venue?.name, venue?.address, event.city].filter(Boolean).join(' · ') || '—';

  const attachments = [];
  const blocks = [];

  for (let i = 0; i < tickets.length; i += 1) {
    const tk = tickets[i];
    const code = tk.qrPayload ? String(tk.qrPayload) : String(tk.id);
    const externalQrUrl = qrExternalUrl(code);

    try {
      // Adjuntamos el PNG del QR por si el cliente bloquea imágenes remotas.
      // eslint-disable-next-line no-await-in-loop
      const buf = await generateQrPngBuffer(code);
      attachments.push({
        filename: `entrada-${i + 1}.png`,
        content: buf,
        contentType: 'image/png',
      });
    } catch (e) {
      console.warn('[ticketEmail] QR buffer:', e.message);
    }

    blocks.push(`
      <div style="border:1px solid #2b2b3a;border-radius:16px;padding:16px;margin:14px 0;background:#12121c;">
        <p style="margin:0;color:#ffffff;font-weight:600;">${escapeHtml(tk.ticketType)}</p>
        <p style="margin:8px 0 4px;color:#94a3b8;font-size:13px;"><strong>Código:</strong></p>
        <p style="margin:0;font-family:monospace;font-size:12px;color:#e0e0ff;word-break:break-all;">${escapeHtml(code)}</p>
        <img src="${externalQrUrl}" alt="QR entrada ${i + 1}" width="180" height="180" style="display:block;background:#0a0a12;padding:8px;border-radius:12px;margin-top:10px;" />
      </div>
    `);
  }

  const buyerNameRaw = loaded.user?.fullName || 'Cliente';

  const textLines = tickets
    .map((tk, i) => {
      const code = tk.qrPayload ? String(tk.qrPayload) : String(tk.id);
      return `${i + 1}. ${tk.ticketType}: ${code}`;
    })
    .join('\n');

  const fechaLine = fmtDateTime(event.startAt);
  const textBody = `
${buyerNameRaw},

Tu pago quedó confirmado. Tus entradas ya están disponibles.

Evento: ${event.title}
Fecha y hora: ${fechaLine}
Lugar: ${lugarTxt}
Cantidad de entradas: ${qty}

${textLines}

Que no te lo cuenten, Gózalo.
  `.trim();

  const html = `
<!DOCTYPE html>
<html lang="es">
<body style="margin:0;background:#0a0a12;color:#e8e8f0;font-family:system-ui,-apple-system,sans-serif;line-height:1.5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;padding:24px;">
    <tr><td>
      <p style="color:#c77dff;font-size:20px;margin:0 0 14px;font-weight:700;">Gózalo</p>
      <h1 style="color:#ffffff;font-size:21px;margin:0 0 14px;line-height:1.25;">Compra confirmada</h1>
      <p>Hola ${escapeHtml(buyerNameRaw)},</p>
      <p>Tu pago se registró correctamente. Datos del evento y los códigos / QR de acceso están abajo.</p>

      <div style="margin:22px 0;padding:18px;background:#16161f;border-radius:16px;border:1px solid #2b2b3a;">
        <p style="margin:4px 0;font-size:18px;font-weight:700;color:#fff;">${escapeHtml(event.title)}</p>
        <p style="margin:12px 0 6px;"><strong>Fecha y hora</strong><br/><span style="color:#bcb8cf;">${escapeHtml(fechaLine)}</span></p>
        <p style="margin:8px 0 6px;"><strong>Lugar</strong><br/><span style="color:#bcb8cf;">${escapeHtml(lugarTxt)}</span></p>
        <p style="margin:14px 0 0;"><strong>Cantidad de entradas</strong>: ${qty}</p>
      </div>

      ${blocks.join('')}

      <p style="margin-top:32px;font-size:18px;color:#ffffff;font-weight:700;">
        Que no te lo cuenten, Gózalo.
      </p>
    </td></tr>
  </table>
</body>
</html>
`.trim();

  const subject = `Gózalo — Tus entradas: ${event.title}`;
  const from = (process.env.RESEND_FROM || 'Gózalo <onboarding@resend.dev>').trim();
  const resend = new Resend(apiKey);

  try {
    const { data, error } = await resend.emails.send(
      {
        from,
        to: emailTo,
        subject,
        html,
        text: textBody,
        attachments: attachments.length ? attachments : undefined,
      },
      { idempotencyKey: `ticket-email-${orderId}` }
    );

    if (error) {
      const msg =
        typeof error === 'object' && error.message
          ? error.message
          : JSON.stringify(error);
      console.warn('[ticketEmail] Resend error:', msg);
      await persistSendError(orderId, msg);
      return { sent: false, error: msg };
    }

    await persistSuccess(orderId);
    return { sent: true, resendId: data?.id };
  } catch (e) {
    const msg = e?.message || String(e);
    console.warn('[ticketEmail] Excepción envío:', msg);
    await persistSendError(orderId, msg);
    return { sent: false, error: msg };
  }
}

module.exports = { sendTicketEmail };
