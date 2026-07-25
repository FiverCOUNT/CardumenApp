const {
  serializeUsuario,
  serializeDispositivo,
  findByFirebaseUid,
  updateUsuarioGoogle,
  createUsuario,
  updateDistanciaAlerta,
} = require('../services/usuarioService');
const {
  normalizeDispositivo,
  findByDeviceUid,
  upsertDispositivo,
} = require('../services/dispositivoService');
const { expirarSaldoSiCorresponde } = require('../services/recargaService');

async function withSaldoVigente(usuario) {
  return expirarSaldoSiCorresponde(usuario);
}

/**
 * Regla Cardumen:
 * - Si el device ya existe → es la misma cuenta: actualizamos Gmail/Firebase
 *   y seguimos ligados a ese dispositivo (saldo, historial, etc.).
 * - Si no existe → se crea / vincula según login o register.
 */
async function resolveByDeviceOrCreate({
  firebaseUser,
  dispositivoRaw,
  profile,
  allowCreate,
}) {
  if (!dispositivoRaw) {
    const err = new Error('dispositivo es requerido');
    err.status = 400;
    throw err;
  }

  const deviceData = normalizeDispositivo(dispositivoRaw);
  const deviceExistente = await findByDeviceUid(deviceData.deviceUid);

  // ── Dispositivo ya conocido: actualizar Gmail y mantener la misma cuenta ──
  if (deviceExistente) {
    if (!deviceExistente.usuario.activo) {
      const err = new Error('Usuario desactivado');
      err.status = 403;
      err.code = 'USER_DISABLED';
      throw err;
    }

    const usuario = await withSaldoVigente(
      await updateUsuarioGoogle(deviceExistente.usuarioId, {
        firebaseUser,
        profile: {
          email: profile.email || firebaseUser.email,
          nombresCompletos: profile.nombresCompletos,
          fotoUrl: profile.fotoUrl,
          dni: profile.dni,
          telefono: profile.telefono,
        },
      }),
    );

    const device = await upsertDispositivo(usuario.id, dispositivoRaw);

    return { usuario, dispositivo: device, created: false };
  }

  // ── Dispositivo nuevo ──
  let usuario = await findByFirebaseUid(firebaseUser.uid);

  if (usuario) {
    if (!usuario.activo) {
      const err = new Error('Usuario desactivado');
      err.status = 403;
      err.code = 'USER_DISABLED';
      throw err;
    }

    usuario = await withSaldoVigente(usuario);
    const device = await upsertDispositivo(usuario.id, dispositivoRaw);
    return { usuario, dispositivo: device, created: false };
  }

  if (!allowCreate) {
    const err = new Error(
      'Usuario no encontrado. Debes completar el registro.'
    );
    err.status = 404;
    err.code = 'USER_NOT_REGISTERED';
    throw err;
  }

  usuario = await createUsuario({
    firebaseUser,
    profile: {
      nombresCompletos: profile.nombresCompletos,
      dni: profile.dni,
      telefono: profile.telefono,
      fotoUrl: profile.fotoUrl,
      email: profile.email || firebaseUser.email,
    },
  });

  const device = await upsertDispositivo(usuario.id, dispositivoRaw);
  return { usuario, dispositivo: device, created: true };
}

async function register(req, res, next) {
  try {
    const firebaseUser = req.firebaseUser;
    const {
      nombresCompletos,
      dni,
      telefono,
      fotoUrl,
      email,
      dispositivo,
    } = req.body || {};

    const result = await resolveByDeviceOrCreate({
      firebaseUser,
      dispositivoRaw: dispositivo,
      profile: { nombresCompletos, dni, telefono, fotoUrl, email },
      allowCreate: true,
    });

    return res.status(result.created ? 201 : 200).json({
      usuario: serializeUsuario(result.usuario),
      dispositivo: serializeDispositivo(result.dispositivo),
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        error: 'Email o DNI ya está en uso',
      });
    }
    if (error.status) {
      return res.status(error.status).json({
        error: error.message,
        code: error.code,
      });
    }
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const firebaseUser = req.firebaseUser;
    const { dispositivo } = req.body || {};

    const result = await resolveByDeviceOrCreate({
      firebaseUser,
      dispositivoRaw: dispositivo,
      profile: {
        email: firebaseUser.email,
        nombresCompletos: firebaseUser.name,
        fotoUrl: firebaseUser.picture,
      },
      allowCreate: false,
    });

    return res.json({
      usuario: serializeUsuario(result.usuario),
      dispositivo: serializeDispositivo(result.dispositivo),
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        error: error.message,
        code: error.code,
      });
    }
    return next(error);
  }
}

async function me(req, res, next) {
  try {
    let usuario = await findByFirebaseUid(req.firebaseUser.uid);

    if (!usuario) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        code: 'USER_NOT_REGISTERED',
      });
    }

    if (!usuario.activo) {
      return res.status(403).json({
        error: 'Usuario desactivado',
        code: 'USER_DISABLED',
      });
    }

    usuario = await withSaldoVigente(usuario);

    return res.json({ usuario: serializeUsuario(usuario) });
  } catch (error) {
    return next(error);
  }
}

async function updatePreferencias(req, res, next) {
  try {
    const usuario = await findByFirebaseUid(req.firebaseUser.uid);
    if (!usuario) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        code: 'USER_NOT_REGISTERED',
      });
    }
    if (!usuario.activo) {
      return res.status(403).json({
        error: 'Usuario desactivado',
        code: 'USER_DISABLED',
      });
    }

    const updated = await updateDistanciaAlerta(
      usuario.id,
      req.body?.distanciaAlertaMetros,
    );
    return res.json({ usuario: serializeUsuario(updated) });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    return next(error);
  }
}

module.exports = {
  register,
  login,
  me,
  updatePreferencias,
};
