const {
  COOKIE_NAME,
  validateAdminCredentials,
  createAdminToken,
  requireAdmin,
} = require('../middleware/adminAuth');
const {
  getConfiguracionPago,
  upsertConfiguracionPago,
  serializeConfiguracionPago,
} = require('../services/pagoService');
const { uploadBuffer } = require('../services/s3Service');
const { s3, cookieSecure } = require('../config/env');

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: cookieSecure,
  path: '/',
};

async function login(req, res, next) {
  try {
    const { username, password } = req.body || {};
    if (!validateAdminCredentials(username, password)) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const token = await createAdminToken();
    res.cookie(COOKIE_NAME, token, {
      ...cookieOptions,
      maxAge: 12 * 60 * 60 * 1000,
    });

    return res.json({ message: 'ok', user: String(username) });
  } catch (err) {
    return next(err);
  }
}

function logout(req, res) {
  res.clearCookie(COOKIE_NAME, cookieOptions);
  return res.json({ message: 'Sesión cerrada' });
}

async function me(req, res) {
  return res.json({ user: req.admin.sub, role: 'admin' });
}

async function getPago(req, res, next) {
  try {
    const row = await getConfiguracionPago();
    return res.json({
      pago: serializeConfiguracionPago(row, req),
    });
  } catch (err) {
    return next(err);
  }
}

async function savePago(req, res, next) {
  try {
    const body = req.body || {};
    const existing = await getConfiguracionPago();
    const files = req.files || {};

    const isProxyOrEmpty = (value) => {
      const v = String(value || '').trim();
      if (!v) return true;
      if (/\/api\/pago\/media\//i.test(v)) return true;
      return false;
    };

    let imagenQrUrl = isProxyOrEmpty(body.imagenQrUrl)
      ? ''
      : String(body.imagenQrUrl).trim();
    let imagenMuestraUrl = isProxyOrEmpty(body.imagenMuestraUrl)
      ? ''
      : String(body.imagenMuestraUrl).trim();

    const qrFile = files.qr?.[0];
    if (qrFile) {
      const uploaded = await uploadBuffer({
        buffer: qrFile.buffer,
        contentType: qrFile.mimetype,
        originalName: qrFile.originalname,
        folder: s3.folderConfig,
        prefix: 'qr',
      });
      // Guardamos la KEY de R2 (no la URL pública)
      imagenQrUrl = uploaded.key;
    }

    const muestraFile = files.muestra?.[0];
    if (muestraFile) {
      const uploaded = await uploadBuffer({
        buffer: muestraFile.buffer,
        contentType: muestraFile.mimetype,
        originalName: muestraFile.originalname,
        folder: s3.folderConfig,
        prefix: 'muestra',
      });
      imagenMuestraUrl = uploaded.key;
    }

    if (!imagenQrUrl) {
      imagenQrUrl = existing?.imagenQrUrl || '';
    }
    if (!imagenMuestraUrl) {
      imagenMuestraUrl = existing?.imagenMuestraUrl || null;
    }

    const row = await upsertConfiguracionPago({
      numero: body.numero,
      imagenQrUrl,
      imagenMuestraUrl,
      titular: body.titular,
      metodo: body.metodo,
      activo: body.activo !== false && body.activo !== 'false' && body.activo !== '0',
      forzarActualizacion: body.forzarActualizacion,
      playStoreUrl: body.playStoreUrl,
      whatsappCapturas: body.whatsappCapturas,
    });

    return res.json({
      message: 'Configuración de pago guardada',
      pago: serializeConfiguracionPago(row, req),
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  login,
  logout,
  me,
  getPago,
  savePago,
  requireAdmin,
};
