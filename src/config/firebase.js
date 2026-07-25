const { createRemoteJWKSet, jwtVerify } = require('jose');

const projectId = process.env.FIREBASE_PROJECT_ID || 'cardumen-dba23';

const JWKS = createRemoteJWKSet(
  new URL(
    'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
  )
);

/**
 * Verifica un Firebase ID token y devuelve el payload (uid, email, etc.).
 */
async function verifyIdToken(idToken) {
  if (!idToken) {
    const err = new Error('Token de Firebase requerido');
    err.status = 401;
    throw err;
  }

  try {
    const { payload } = await jwtVerify(idToken, JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });

    if (!payload.sub) {
      const err = new Error('Token de Firebase inválido');
      err.status = 401;
      throw err;
    }

    return {
      uid: payload.sub,
      email: payload.email || null,
      emailVerified: Boolean(payload.email_verified),
      name: payload.name || null,
      picture: payload.picture || null,
    };
  } catch (error) {
    if (error.status) throw error;
    const err = new Error('Token de Firebase inválido o expirado');
    err.status = 401;
    throw err;
  }
}

module.exports = {
  projectId,
  verifyIdToken,
};
