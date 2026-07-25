const prisma = require('../lib/prisma');

function serializeUsuario(usuario) {
  if (!usuario) return null;

  return {
    id: usuario.id,
    firebaseUid: usuario.firebaseUid,
    email: usuario.email,
    emailVerificado: usuario.emailVerificado,
    nombresCompletos: usuario.nombresCompletos,
    fotoUrl: usuario.fotoUrl,
    dni: usuario.dni,
    telefono: usuario.telefono,
    saldoSoles: usuario.saldoSoles != null ? String(usuario.saldoSoles) : '0.00',
    saldoVigenteHasta: usuario.saldoVigenteHasta,
    distanciaAlertaMetros:
      usuario.distanciaAlertaMetros != null
        ? Number(usuario.distanciaAlertaMetros)
        : 400,
    activo: usuario.activo,
    createdAt: usuario.createdAt,
    updatedAt: usuario.updatedAt,
  };
}

function serializeDispositivo(dispositivo) {
  if (!dispositivo) return null;

  return {
    id: dispositivo.id,
    deviceUid: dispositivo.deviceUid,
    fingerprint: dispositivo.fingerprint,
    platformDeviceId: dispositivo.platformDeviceId,
    plataforma: dispositivo.plataforma,
    marca: dispositivo.marca,
    modelo: dispositivo.modelo,
    sistemaOperativo: dispositivo.sistemaOperativo,
    versionApp: dispositivo.versionApp,
    ultimoAcceso: dispositivo.ultimoAcceso,
    activo: dispositivo.activo,
  };
}

async function findByFirebaseUid(firebaseUid) {
  return prisma.usuario.findUnique({
    where: { firebaseUid },
  });
}

async function findById(id) {
  return prisma.usuario.findUnique({ where: { id } });
}

/**
 * Libera email/firebaseUid de otros usuarios para poder asignarlos
 * al dueño del dispositivo (evita choque de unique).
 */
async function releaseGoogleIdentity({ firebaseUid, email, keepUsuarioId }) {
  const conflicts = await prisma.usuario.findMany({
    where: {
      id: { not: keepUsuarioId },
      OR: [{ firebaseUid }, { email }],
    },
  });

  for (const other of conflicts) {
    const stamp = Date.now();
    await prisma.usuario.update({
      where: { id: other.id },
      data: {
        firebaseUid: `liberado_${other.id}_${stamp}`,
        email: `liberado_${other.id}_${stamp}@cardumen.invalid`,
        activo: false,
      },
    });
  }
}

/**
 * Actualiza el Gmail / Firebase del usuario dueño del dispositivo.
 */
async function updateUsuarioGoogle(usuarioId, { firebaseUser, profile = {} }) {
  const email = String(profile.email || firebaseUser.email || '')
    .trim()
    .toLowerCase();

  if (!email) {
    const err = new Error('email es requerido');
    err.status = 400;
    throw err;
  }

  await releaseGoogleIdentity({
    firebaseUid: firebaseUser.uid,
    email,
    keepUsuarioId: usuarioId,
  });

  const data = {
    firebaseUid: firebaseUser.uid,
    email,
    emailVerificado: Boolean(firebaseUser.emailVerified),
    activo: true,
  };

  if (profile.nombresCompletos && String(profile.nombresCompletos).trim()) {
    data.nombresCompletos = String(profile.nombresCompletos).trim();
  }
  if (profile.fotoUrl || firebaseUser.picture) {
    data.fotoUrl = profile.fotoUrl
      ? String(profile.fotoUrl).trim()
      : firebaseUser.picture;
  }
  if (profile.dni !== undefined) {
    data.dni = profile.dni ? String(profile.dni).trim() : null;
  }
  if (profile.telefono !== undefined) {
    data.telefono = profile.telefono ? String(profile.telefono).trim() : null;
  }

  return prisma.usuario.update({
    where: { id: usuarioId },
    data,
  });
}

async function createUsuario({ firebaseUser, profile }) {
  const nombresCompletos = String(profile.nombresCompletos || '').trim();
  const email = String(profile.email || firebaseUser.email || '')
    .trim()
    .toLowerCase();
  const dni = profile.dni ? String(profile.dni).trim() : null;
  const telefono = profile.telefono ? String(profile.telefono).trim() : null;
  const fotoUrl = profile.fotoUrl
    ? String(profile.fotoUrl).trim()
    : firebaseUser.picture || null;

  if (!nombresCompletos) {
    const err = new Error('nombresCompletos es requerido');
    err.status = 400;
    throw err;
  }

  if (!email) {
    const err = new Error('email es requerido');
    err.status = 400;
    throw err;
  }

  await releaseGoogleIdentity({
    firebaseUid: firebaseUser.uid,
    email,
    keepUsuarioId: 'nuevo', // no coincide con ningún id real
  });

  return prisma.usuario.create({
    data: {
      firebaseUid: firebaseUser.uid,
      email,
      emailVerificado: Boolean(firebaseUser.emailVerified),
      nombresCompletos,
      fotoUrl,
      dni,
      telefono,
      distanciaAlertaMetros: 400,
    },
  });
}

async function updateDistanciaAlerta(usuarioId, metros) {
  const value = Number(metros);
  if (!Number.isFinite(value) || value < 50 || value > 5000) {
    const err = new Error('La distancia debe estar entre 50 y 5000 metros');
    err.status = 400;
    throw err;
  }

  return prisma.usuario.update({
    where: { id: usuarioId },
    data: { distanciaAlertaMetros: Math.round(value) },
  });
}

module.exports = {
  serializeUsuario,
  serializeDispositivo,
  findByFirebaseUid,
  findById,
  releaseGoogleIdentity,
  updateUsuarioGoogle,
  createUsuario,
  updateDistanciaAlerta,
};
