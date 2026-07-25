const { SignJWT, jwtVerify } = require('jose');
const { admin, jwtSecret } = require('../config/env');

const COOKIE_NAME = 'cardumen_admin';
const secret = new TextEncoder().encode(jwtSecret);

function timingSafeEqual(a, b) {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (aa.length !== bb.length) return false;
  return require('crypto').timingSafeEqual(aa, bb);
}

function validateAdminCredentials(username, password) {
  if (!admin.password) {
    const err = new Error('ADMIN_PASSWORD no configurada en .env');
    err.status = 500;
    throw err;
  }
  const userOk = timingSafeEqual(username || '', admin.user);
  const passOk = timingSafeEqual(password || '', admin.password);
  return userOk && passOk;
}

async function createAdminToken() {
  return new SignJWT({ role: 'admin', sub: admin.user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(secret);
}

async function verifyAdminToken(token) {
  const { payload } = await jwtVerify(token, secret);
  if (payload.role !== 'admin') {
    const err = new Error('No autorizado');
    err.status = 401;
    throw err;
  }
  return payload;
}

async function requireAdmin(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    req.admin = await verifyAdminToken(token);
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Sesión inválida o expirada' });
  }
}

module.exports = {
  COOKIE_NAME,
  validateAdminCredentials,
  createAdminToken,
  verifyAdminToken,
  requireAdmin,
};
