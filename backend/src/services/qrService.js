const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

const qrEncodeOptions = {
  errorCorrectionLevel: 'M',
  margin: 2,
  width: 280,
  color: { dark: '#FFFFFF', light: '#0a0a12' },
};

async function generateQrPng(dataString) {
  return QRCode.toDataURL(dataString, qrEncodeOptions);
}

/** PNG binario para adjuntos CID en correos (Resend). */
async function generateQrPngBuffer(dataString) {
  return QRCode.toBuffer(dataString, qrEncodeOptions);
}

function createPayload(prefix) {
  return `${prefix}_${uuidv4()}`;
}

module.exports = { generateQrPng, generateQrPngBuffer, createPayload };
