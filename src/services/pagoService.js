const prisma = require('../lib/prisma');

function requestBaseUrl(req) {
  if (process.env.PUBLIC_API_URL) {
    return process.env.PUBLIC_API_URL.replace(/\/$/, '');
  }
  if (!req) return '';
  return `${req.protocol}://${req.get('host')}`;
}

function serializeConfiguracionPago(row, req) {
  if (!row) return null;
  const base = requestBaseUrl(req);
  const qrMedia = `${base}/api/pago/media/qr`;
  const muestraMedia = `${base}/api/pago/media/muestra`;

  return {
    id: row.id,
    numero: row.numero,
    /** Key o URL cruda en DB */
    imagenQrKey: row.imagenQrUrl,
    imagenMuestraKey: row.imagenMuestraUrl,
    /** URLs que sí cargan (proxy backend → R2) */
    imagenQrUrl: row.imagenQrUrl ? qrMedia : null,
    imagenMuestraUrl: row.imagenMuestraUrl ? muestraMedia : null,
    titular: row.titular,
    metodo: row.metodo,
    activo: row.activo,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function getConfiguracionActiva() {
  return prisma.configuracionPago.findFirst({
    where: { activo: true },
    orderBy: { updatedAt: 'desc' },
  });
}

async function getConfiguracionPago() {
  return prisma.configuracionPago.findFirst({
    orderBy: [{ activo: 'desc' }, { updatedAt: 'desc' }],
  });
}

/**
 * Crea o actualiza la configuración de pago activa.
 * imagenQrUrl / imagenMuestraUrl pueden ser keys de R2 (ej. config/qr-....png).
 */
async function upsertConfiguracionPago({
  numero,
  imagenQrUrl,
  imagenMuestraUrl = null,
  titular = null,
  metodo = 'yape',
  activo = true,
}) {
  const num = String(numero || '').trim();
  const qr = String(imagenQrUrl || '').trim();
  const muestra =
    imagenMuestraUrl != null && String(imagenMuestraUrl).trim() !== ''
      ? String(imagenMuestraUrl).trim()
      : null;

  if (!num) {
    const err = new Error('numero es requerido');
    err.status = 400;
    throw err;
  }
  if (!qr) {
    const err = new Error('imagenQrUrl es requerido');
    err.status = 400;
    throw err;
  }

  const existing = await getConfiguracionPago();
  const data = {
    numero: num,
    imagenQrUrl: qr,
    imagenMuestraUrl: muestra,
    titular: titular != null ? String(titular).trim() || null : null,
    metodo: String(metodo || 'yape').trim() || 'yape',
    activo: Boolean(activo),
  };

  if (existing) {
    if (muestra == null && existing.imagenMuestraUrl) {
      data.imagenMuestraUrl = existing.imagenMuestraUrl;
    }
    return prisma.configuracionPago.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.configuracionPago.create({ data });
}

module.exports = {
  serializeConfiguracionPago,
  getConfiguracionActiva,
  getConfiguracionPago,
  upsertConfiguracionPago,
};
