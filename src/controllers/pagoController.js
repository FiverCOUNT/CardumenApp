const {
  getConfiguracionActiva,
  serializeConfiguracionPago,
} = require('../services/pagoService');
const { keyFromStoredUrl, getObjectByKey } = require('../services/s3Service');

async function getActiva(req, res, next) {
  try {
    const row = await getConfiguracionActiva();
    if (!row) {
      return res.status(404).json({
        error: 'No hay configuración de pago activa',
      });
    }
    return res.json({
      pago: serializeConfiguracionPago(row, req),
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Sirve QR / muestra desde R2 con credenciales (no depende de URL pública).
 * GET /api/pago/media/qr | /api/pago/media/muestra
 */
async function streamMedia(req, res, next) {
  try {
    const tipo = String(req.params.tipo || '').toLowerCase();
    if (tipo !== 'qr' && tipo !== 'muestra') {
      return res.status(400).json({ error: 'tipo inválido (qr|muestra)' });
    }

    const row = await getConfiguracionActiva();
    if (!row) {
      return res.status(404).json({ error: 'No hay configuración de pago activa' });
    }

    const stored =
      tipo === 'muestra' ? row.imagenMuestraUrl : row.imagenQrUrl;
    if (!stored) {
      return res.status(404).json({ error: `No hay imagen ${tipo} configurada` });
    }

    const key = keyFromStoredUrl(stored);
    if (!key) {
      return res.status(404).json({ error: 'No se pudo resolver la imagen' });
    }

    const obj = await getObjectByKey(key);
    res.setHeader('Content-Type', obj.contentType);
    res.setHeader('Cache-Control', 'public, max-age=300');
    if (obj.contentLength != null) {
      res.setHeader('Content-Length', String(obj.contentLength));
    }

    if (obj.body && typeof obj.body.pipe === 'function') {
      obj.body.pipe(res);
      return;
    }

    const bytes = await obj.body.transformToByteArray();
    return res.send(Buffer.from(bytes));
  } catch (err) {
    if (err?.$metadata?.httpStatusCode === 404 || err?.name === 'NoSuchKey') {
      return res.status(404).json({ error: 'Imagen no encontrada en storage' });
    }
    return next(err);
  }
}

module.exports = {
  getActiva,
  streamMedia,
};
