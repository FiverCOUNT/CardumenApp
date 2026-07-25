const prisma = require('../lib/prisma');

function normalizeDispositivo(input = {}) {
  const deviceUid = String(input.deviceUid || '').trim();
  const plataforma = String(input.plataforma || '').trim();

  if (!deviceUid) {
    const err = new Error('deviceUid es requerido');
    err.status = 400;
    throw err;
  }

  if (!plataforma) {
    const err = new Error('plataforma es requerida');
    err.status = 400;
    throw err;
  }

  return {
    deviceUid,
    fingerprint: input.fingerprint ? String(input.fingerprint).trim() : null,
    platformDeviceId: input.platformDeviceId
      ? String(input.platformDeviceId).trim()
      : null,
    plataforma,
    marca: input.marca ? String(input.marca).trim() : null,
    modelo: input.modelo ? String(input.modelo).trim() : null,
    sistemaOperativo: input.sistemaOperativo
      ? String(input.sistemaOperativo).trim()
      : null,
    versionApp: input.versionApp ? String(input.versionApp).trim() : null,
    pushToken: input.pushToken ? String(input.pushToken).trim() : null,
  };
}

async function findByDeviceUid(deviceUid) {
  return prisma.dispositivo.findUnique({
    where: { deviceUid: String(deviceUid || '').trim() },
    include: { usuario: true },
  });
}

/**
 * Actualiza datos del dispositivo existente o lo crea para el usuario.
 * El deviceUid manda: siempre queda ligado al usuario indicado.
 */
async function upsertDispositivo(usuarioId, rawDispositivo) {
  const data = normalizeDispositivo(rawDispositivo);

  const existente = await prisma.dispositivo.findUnique({
    where: { deviceUid: data.deviceUid },
  });

  if (existente) {
    return prisma.dispositivo.update({
      where: { id: existente.id },
      data: {
        usuarioId,
        fingerprint: data.fingerprint ?? existente.fingerprint,
        platformDeviceId: data.platformDeviceId ?? existente.platformDeviceId,
        plataforma: data.plataforma,
        marca: data.marca ?? existente.marca,
        modelo: data.modelo ?? existente.modelo,
        sistemaOperativo: data.sistemaOperativo ?? existente.sistemaOperativo,
        versionApp: data.versionApp ?? existente.versionApp,
        pushToken: data.pushToken ?? existente.pushToken,
        ultimoAcceso: new Date(),
        activo: true,
      },
    });
  }

  return prisma.dispositivo.create({
    data: {
      usuarioId,
      ...data,
      ultimoAcceso: new Date(),
      activo: true,
    },
  });
}

module.exports = {
  normalizeDispositivo,
  findByDeviceUid,
  upsertDispositivo,
};
