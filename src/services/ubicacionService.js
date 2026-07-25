const prisma = require('../lib/prisma');

const TTL_HOURS = 5;

function serializeUbicacion(u) {
  if (!u) return null;
  return {
    id: u.id,
    usuarioId: u.usuarioId,
    latitud: u.latitud != null ? parseFloat(String(u.latitud)) : null,
    longitud: u.longitud != null ? parseFloat(String(u.longitud)) : null,
    titulo: u.titulo,
    descripcion: u.descripcion,
    expiresAt: u.expiresAt,
    activo: u.activo,
    createdAt: u.createdAt,
    usuario: u.usuario
      ? {
          id: u.usuario.id,
          nombresCompletos: u.usuario.nombresCompletos,
          fotoUrl: u.usuario.fotoUrl,
        }
      : undefined,
  };
}

async function createUbicacion({
  usuarioId,
  latitud,
  longitud,
  titulo,
  descripcion,
}) {
  const lat = Number(latitud);
  const lng = Number(longitud);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    const err = new Error('latitud y longitud son requeridas');
    err.status = 400;
    throw err;
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    const err = new Error('Coordenadas inválidas');
    err.status = 400;
    throw err;
  }

  const expiresAt = new Date(Date.now() + TTL_HOURS * 60 * 60 * 1000);

  return prisma.ubicacion.create({
    data: {
      usuarioId,
      latitud: lat,
      longitud: lng,
      titulo: titulo ? String(titulo).trim().slice(0, 150) : null,
      descripcion: descripcion
        ? String(descripcion).trim().slice(0, 500)
        : null,
      expiresAt,
      activo: true,
    },
    include: {
      usuario: {
        select: { id: true, nombresCompletos: true, fotoUrl: true },
      },
    },
  });
}

async function listActivas() {
  const now = new Date();
  return prisma.ubicacion.findMany({
    where: {
      activo: true,
      expiresAt: { gt: now },
    },
    include: {
      usuario: {
        select: { id: true, nombresCompletos: true, fotoUrl: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
}

async function deleteUbicacion({ id, usuarioId }) {
  const existing = await prisma.ubicacion.findUnique({ where: { id } });
  if (!existing) {
    const err = new Error('Ubicación no encontrada');
    err.status = 404;
    throw err;
  }
  if (existing.usuarioId !== usuarioId) {
    const err = new Error('Solo puedes eliminar tus propias ubicaciones');
    err.status = 403;
    throw err;
  }

  return prisma.ubicacion.update({
    where: { id },
    data: { activo: false },
    include: {
      usuario: {
        select: { id: true, nombresCompletos: true, fotoUrl: true },
      },
    },
  });
}

module.exports = {
  TTL_HOURS,
  serializeUbicacion,
  createUbicacion,
  listActivas,
  deleteUbicacion,
};
