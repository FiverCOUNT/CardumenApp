const prisma = require('../lib/prisma');

/** Vigencia del saldo: 7 días (1 semana). */
const RECARGA_TTL_DAYS = 7;

function parseFechaPago(fecha) {
  if (fecha == null || fecha === '') return null;
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) {
    const err = new Error('fecha inválida');
    err.status = 400;
    throw err;
  }
  return d;
}

function serializeRecarga(recarga) {
  if (!recarga) return null;
  return {
    id: recarga.id,
    usuario_id: recarga.usuarioId,
    monto_pago: recarga.montoPago != null ? String(recarga.montoPago) : null,
    fecha: recarga.fechaPago,
    destino: recarga.destino,
    codigo_seguridad: recarga.codigoSeguridad,
    numero_operacion: recarga.numeroOperacion,
    dni: recarga.dni,
    monto: String(recarga.monto),
    monto_restante: String(recarga.montoRestante),
    expires_at: recarga.expiresAt,
    estado: recarga.estado,
    metodo_pago: recarga.metodoPago,
    created_at: recarga.createdAt,
  };
}

function calcExpiresAt(from = new Date()) {
  return new Date(from.getTime() + RECARGA_TTL_DAYS * 24 * 60 * 60 * 1000);
}

function saldoVencido(usuario, now = new Date()) {
  const hasta = usuario.saldoVigenteHasta
    ? new Date(usuario.saldoVigenteHasta)
    : null;
  return Boolean(hasta && hasta.getTime() <= now.getTime());
}

/**
 * Si la vigencia de 7 días ya pasó:
 * - saldo_soles = 0
 * - saldo_vigente_hasta = null
 * - recargas completadas vencidas → estado expirada
 */
async function aplicarExpiracionEnTx(tx, usuario, now = new Date()) {
  if (!saldoVencido(usuario, now) && Number(usuario.saldoSoles || 0) <= 0) {
    return usuario;
  }

  if (!saldoVencido(usuario, now)) {
    return usuario;
  }

  await tx.recarga.updateMany({
    where: {
      usuarioId: usuario.id,
      estado: 'completada',
      expiresAt: { lte: now },
    },
    data: {
      estado: 'expirada',
      montoRestante: 0,
    },
  });

  return tx.usuario.update({
    where: { id: usuario.id },
    data: {
      saldoSoles: 0,
      saldoVigenteHasta: null,
    },
  });
}

/**
 * Suma la recarga al saldo vigente.
 * - Si aún está dentro de los 7 días → SUMA (ej. 2 + 10 = 12)
 * - Si ya venció la semana → pone 0 y luego suma solo el nuevo monto
 * - Reinicia vigencia a ahora + 7 días
 */
async function acreditarSobreUsuario(tx, usuario, {
  amount,
  dni,
  fechaPago,
  destino,
  codigoSeguridad,
  numeroOperacion,
  metodoPago,
  referencia,
}) {
  const now = new Date();
  const usuarioVigente = await aplicarExpiracionEnTx(tx, usuario, now);
  const saldoBase = Number(usuarioVigente.saldoSoles || 0);
  const expiresAt = calcExpiresAt(now);
  const nuevoSaldo = saldoBase + amount;

  const recarga = await tx.recarga.create({
    data: {
      usuarioId: usuarioVigente.id,
      dni,
      monto: amount.toFixed(2),
      montoPago: amount.toFixed(2),
      fechaPago,
      destino,
      codigoSeguridad,
      numeroOperacion,
      montoRestante: amount.toFixed(2),
      expiresAt,
      estado: 'completada',
      metodoPago,
      referencia,
    },
  });

  const usuarioActualizado = await tx.usuario.update({
    where: { id: usuarioVigente.id },
    data: {
      saldoSoles: nuevoSaldo.toFixed(2),
      saldoVigenteHasta: expiresAt,
    },
  });

  return { recarga, usuario: usuarioActualizado };
}

/**
 * Acredita una recarga buscando al usuario por DNI.
 */
async function acreditarRecargaPorDni({
  monto_pago,
  fecha = null,
  destino = null,
  codigo_seguridad = null,
  numero_operacion = null,
  dni,
  metodoPago = 'yape',
}) {
  const dniNorm = String(dni || '').trim();
  if (!dniNorm) {
    const err = new Error('dni es requerido');
    err.status = 400;
    throw err;
  }

  const amount = Number(monto_pago);
  if (!Number.isFinite(amount) || amount <= 0) {
    const err = new Error('monto_pago debe ser mayor a 0');
    err.status = 400;
    throw err;
  }

  const fechaPago = parseFechaPago(fecha);
  const numeroOperacion =
    numero_operacion != null && String(numero_operacion).trim() !== ''
      ? String(numero_operacion).trim()
      : null;

  if (numeroOperacion) {
    const dup = await prisma.recarga.findUnique({
      where: { numeroOperacion },
    });
    if (dup) {
      const err = new Error('numero_operacion ya registrado');
      err.status = 409;
      err.code = 'DUPLICATE_OPERATION';
      throw err;
    }
  }

  const usuario = await prisma.usuario.findUnique({ where: { dni: dniNorm } });
  if (!usuario) {
    const err = new Error(`No hay usuario con dni ${dniNorm}`);
    err.status = 404;
    err.code = 'USER_NOT_FOUND';
    throw err;
  }
  if (!usuario.activo) {
    const err = new Error('Usuario desactivado');
    err.status = 403;
    throw err;
  }

  return prisma.$transaction(async (tx) =>
    acreditarSobreUsuario(tx, usuario, {
      amount,
      dni: dniNorm,
      fechaPago,
      destino: destino != null ? String(destino) : null,
      codigoSeguridad:
        codigo_seguridad != null ? String(codigo_seguridad) : null,
      numeroOperacion,
      metodoPago,
      referencia: numeroOperacion,
    }),
  );
}

/**
 * Acredita una recarga al usuario (por id interno).
 */
async function acreditarRecarga({
  usuarioId,
  monto,
  metodoPago = 'yape',
  referencia = null,
  dni = null,
  fecha = null,
  destino = null,
  codigoSeguridad = null,
  numeroOperacion = null,
}) {
  const amount = Number(monto);
  if (!Number.isFinite(amount) || amount <= 0) {
    const err = new Error('El monto de recarga debe ser mayor a 0');
    err.status = 400;
    throw err;
  }

  return prisma.$transaction(async (tx) => {
    const usuario = await tx.usuario.findUnique({ where: { id: usuarioId } });
    if (!usuario) {
      const err = new Error('Usuario no encontrado');
      err.status = 404;
      throw err;
    }

    return acreditarSobreUsuario(tx, usuario, {
      amount,
      dni: dni || usuario.dni || 'SIN_DNI',
      fechaPago: parseFechaPago(fecha),
      destino,
      codigoSeguridad,
      numeroOperacion,
      metodoPago,
      referencia,
    });
  });
}

/**
 * Si el saldo venció (pasó 1 semana), lo pone en 0.
 */
async function expirarSaldoSiCorresponde(usuario) {
  if (!usuario) return usuario;
  if (!saldoVencido(usuario)) return usuario;

  return prisma.$transaction(async (tx) => aplicarExpiracionEnTx(tx, usuario));
}

function saldoHabilitadoParaMonitoreo(usuario, minSaldo = 7) {
  if (!usuario) return false;
  if (saldoVencido(usuario)) return false;
  const saldo = Number(usuario.saldoSoles || 0);
  return Number.isFinite(saldo) && saldo >= minSaldo;
}

module.exports = {
  RECARGA_TTL_DAYS,
  serializeRecarga,
  acreditarRecargaPorDni,
  acreditarRecarga,
  expirarSaldoSiCorresponde,
  saldoHabilitadoParaMonitoreo,
};
