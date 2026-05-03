const path = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config({
  path: path.join(__dirname, '..', '..', '.env'),
  override: true,
});

let transporter;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

async function sendMail({ to, subject, html, text }) {
  const t = getTransporter();
  if (!t) {
    console.warn('[email] SMTP no configurado — mensaje no enviado:', subject);
    return { sent: false, reason: 'no_smtp' };
  }
  await t.sendMail({
    from: process.env.EMAIL_FROM || 'noreply@gozalo.do',
    to,
    subject,
    text,
    html,
  });
  return { sent: true };
}

async function sendReservationConfirmation(email, payload) {
  const subject = `Gózalo — Confirmación de reserva: ${payload.eventTitle}`;
  const html = `
    <div style="font-family:system-ui;background:#0a0a12;color:#e8e8f0;padding:24px;">
      <h1 style="color:#2979FF;">Tu noche comienza aquí</h1>
      <p>Hola ${payload.name},</p>
      <p>Tu reserva para <strong>${payload.eventTitle}</strong> en <strong>${payload.venueName}</strong> está <strong>${payload.status}</strong>.</p>
      <p>Mesa: ${payload.tableLabel} · Personas: ${payload.partySize}</p>
      <p>Total: RD$ ${payload.total}</p>
      <p>Presenta tu código QR en la entrada.</p>
    </div>
  `;
  return sendMail({ to: email, subject, html });
}

async function sendWelcome(email, name) {
  return sendMail({
    to: email,
    subject: 'Bienvenido a Gózalo',
    html: `<p>Hola ${name},</p><p>Tu cuenta en Gózalo está lista. Tu noche comienza aquí.</p>`,
  });
}

module.exports = { sendMail, sendReservationConfirmation, sendWelcome };
