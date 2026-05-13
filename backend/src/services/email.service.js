'use strict';

const QRCode = require('qrcode');
const { Resend } = require('resend');

/**
 * Envío de correos (Resend). Sin `RESEND_API_KEY` las llamadas devuelven skipped (no rompen el flujo).
 */

function moneyRD(n) {
  const x = Number(n) || 0;
  return `RD$ ${x.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function qrDataUrl(payload) {
  if (!payload) return null;
  try {
    return await QRCode.toDataURL(String(payload).slice(0, 2048), { margin: 1, width: 220 });
  } catch {
    return null;
  }
}

async function sendOrderResend({ order }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return { ok: true, skipped: true, message: 'Email no enviado: configura RESEND_API_KEY' };
  }
  const to = order.user?.email;
  if (!to) {
    return { ok: false, message: 'La orden no tiene email de cliente' };
  }

  const ticket = order.tickets?.[0];
  const qrImg = ticket?.qrPayload ? await qrDataUrl(ticket.qrPayload) : null;
  const rows =
    order.items?.map(
      (i) =>
        `<tr><td style="padding:8px;border-bottom:1px solid #eee">${i.product?.name ?? 'Ítem'}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${i.quantity} × ${moneyRD(i.unitPrice ?? i.lineTotal)}</td></tr>`
    ) ?? [];
  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
    <h1 style="font-size:20px;">${order.event?.title ? `Entrada — ${order.event.title}` : 'Tu orden Gozalo'}</h1>
    <p>Hola ${order.user?.fullName ?? ''},</p>
    <p>Reenviamos la confirmación de tu compra.</p>
    ${qrImg ? `<p style="text-align:center"><img src="${qrImg}" alt="QR" width="220" height="220" /></p>` : ''}
    <table style="width:100%;border-collapse:collapse">${rows.join('')}</table>
    <p style="margin-top:16px;font-weight:bold">Total: ${moneyRD(order.total)}</p>
    </body></html>`;

  const resend = new Resend(key);
  const from = process.env.RESEND_FROM || 'Gozalo <onboarding@resend.dev>';
  const { data, error } = await resend.emails.send({
    from,
    to: [to],
    subject: order.event?.title ? `Confirmación — ${order.event.title}` : 'Confirmación de orden — Gozalo',
    html,
  });
  if (error) {
    const err = new Error(error.message || 'Resend error');
    err.status = 502;
    throw err;
  }
  return { ok: true, id: data?.id };
}

async function sendOrderRefundNotice({ order, reason }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return { ok: true, skipped: true };
  }
  const to = order.user?.email;
  if (!to) {
    return { ok: true, skipped: true };
  }
  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
    <h1 style="font-size:18px;">Reembolso procesado</h1>
    <p>Hola ${order.user?.fullName ?? ''},</p>
    <p>Tu orden ha sido marcada como reembolsada.</p>
    <p><strong>Motivo:</strong> ${String(reason || '').replace(/</g, '')}</p>
    <p>Importe referenciado: ${moneyRD(order.total)}</p>
    </body></html>`;

  const resend = new Resend(key);
  const from = process.env.RESEND_FROM || 'Gozalo <onboarding@resend.dev>';
  const { error } = await resend.emails.send({
    from,
    to: [to],
    subject: 'Reembolso — Gozalo',
    html,
  });
  if (error) {
    const err = new Error(error.message || 'Resend error');
    err.status = 502;
    throw err;
  }
  return { ok: true };
}

module.exports = {
  sendOrderResend,
  sendOrderRefundNotice,
};
