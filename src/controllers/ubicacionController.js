const { findByFirebaseUid } = require('../services/usuarioService');
const {
  serializeUbicacion,
  createUbicacion,
  listActivas,
  deleteUbicacion,
} = require('../services/ubicacionService');

async function requireUsuario(req, res, next) {
  try {
    const usuario = await findByFirebaseUid(req.firebaseUser.uid);
    if (!usuario) {
      return res.status(404).json({
        error: 'Usuario no registrado',
        code: 'USER_NOT_REGISTERED',
      });
    }
    if (!usuario.activo) {
      return res.status(403).json({
        error: 'Usuario desactivado',
        code: 'USER_DISABLED',
      });
    }
    req.usuario = usuario;
    return next();
  } catch (error) {
    return next(error);
  }
}

async function create(req, res, next) {
  try {
    const { latitud, longitud, titulo, descripcion } = req.body || {};
    const ubicacion = await createUbicacion({
      usuarioId: req.usuario.id,
      latitud,
      longitud,
      titulo: titulo || `Punto de ${req.usuario.nombresCompletos}`,
      descripcion,
    });

    return res.status(201).json({
      ubicacion: serializeUbicacion(ubicacion),
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    return next(error);
  }
}

async function list(req, res, next) {
  try {
    const items = await listActivas();
    return res.json({
      ubicaciones: items.map(serializeUbicacion),
    });
  } catch (error) {
    return next(error);
  }
}

async function remove(req, res, next) {
  try {
    const id = String(req.params.id || '').trim();
    if (!id) {
      return res.status(400).json({ error: 'id requerido' });
    }

    const ubicacion = await deleteUbicacion({
      id,
      usuarioId: req.usuario.id,
    });

    return res.json({
      message: 'Ubicación eliminada',
      ubicacion: serializeUbicacion(ubicacion),
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    return next(error);
  }
}

module.exports = {
  requireUsuario,
  create,
  list,
  remove,
};
