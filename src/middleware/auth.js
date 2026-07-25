const { verifyIdToken } = require('../config/firebase');

async function requireFirebaseAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Authorization Bearer requerido' });
    }

    req.firebaseUser = await verifyIdToken(token);
    return next();
  } catch (error) {
    return res.status(error.status || 401).json({
      error: error.message || 'No autorizado',
    });
  }
}

module.exports = {
  requireFirebaseAuth,
};
