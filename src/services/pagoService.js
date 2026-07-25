const prisma = require('../lib/prisma');

function requestBaseUrl(req) {
  if (process.env.PUBLIC_API_URL) {
    return process.env.PUBLIC_API_URL.replace(/\/$/, '');
  }
  if (!req) return '';
  return `${req.protocol}://${req.get('host')}`;
}

function asBool(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const v = String(value).toLowerCase();
  return v === 'true' || v === '1' || v === 'on' || v === 'yes';
}

/** Normaliza a dígitos; si es 9 dígitos (Perú) antepone 51 para wa.me */
function buildWhatsappUrl(numero) {
  if (!numero) return null;
  const digits = String(numero).replace(/\D/g, '');
  if (!digits) return null;
  const full = digits.length === 9 ? `51${digits}` : digits;
  return `https://wa.me/${full}`;
}

function serializeConfiguracionPago(row, req) {
  if (!row) return null;
  const base = requestBaseUrl(req);
  const qrMedia = `${base}/api/pago/media/qr`;
  const muestraMedia = `${base}/api/pago/media/muestra`;
  const whatsappCapturas = row.whatsappCapturas || null;

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
    forzarActualizacion: Boolean(row.forzarActualizacion),
    playStoreUrl: row.playStoreUrl || null,
    whatsappCapturas,
    /** Enlace listo para abrir WhatsApp (recargas / envío de caps) */
    whatsappUrl: buildWhatsappUrl(whatsappCapturas),
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
 */
async function upsertConfiguracionPago({
  numero,
  imagenQrUrl,
  imagenMuestraUrl = null,
  titular = null,
  metodo = 'yape',
  activo = true,
  forzarActualizacion = false,
  playStoreUrl = null,
  whatsappCapturas = null,
}) {
  const num = String(numero || '').trim();
  const qr = String(imagenQrUrl || '').trim();
  const muestra =
    imagenMuestraUrl != null && String(imagenMuestraUrl).trim() !== ''
      ? String(imagenMuestraUrl).trim()
      : null;
  const store =
    playStoreUrl != null && String(playStoreUrl).trim() !== ''
      ? String(playStoreUrl).trim()
      : null;
  const wa =
    whatsappCapturas != null && String(whatsappCapturas).trim() !== ''
      ? String(whatsappCapturas).replace(/\D/g, '')
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
    activo: asBool(activo, true),
    forzarActualizacion: asBool(forzarActualizacion, false),
    playStoreUrl: store,
    whatsappCapturas: wa,
  };

  if (existing) {
    if (muestra == null && existing.imagenMuestraUrl) {
      data.imagenMuestraUrl = existing.imagenMuestraUrl;
    }
    if (store == null && existing.playStoreUrl) {
      data.playStoreUrl = existing.playStoreUrl;
    }
    if (wa == null && existing.whatsappCapturas) {
      data.whatsappCapturas = existing.whatsappCapturas;
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
  asBool,
  buildWhatsappUrl,
};
