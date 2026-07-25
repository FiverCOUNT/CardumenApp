const prisma = require('../lib/prisma');

function serializeBilletera(billetera) {
  if (!billetera) {
    return {
      saldoSoles: '0.00',
      vigenteHasta: null,
      bloqueada: false,
      vigente: false,
    };
  }

  const now = new Date();
  const vigenteHasta = billetera.vigenteHasta ? new Date(billetera.vigenteHasta) : null;
  const saldo = Number(billetera.saldoSoles || 0);
  const vigente =
    !billetera.bloqueada &&
    saldo > 0 &&
    (!vigenteHasta || vigenteHasta.getTime() > now.getTime());

  return {
    id: billetera.id,
    saldoSoles: String(billetera.saldoSoles ?? '0.00'),
    vigenteHasta: billetera.vigenteHasta,
    bloqueada: Boolean(billetera.bloqueada),
    vigente,
  };
}

async function createBilleteraForUsuario(usuarioId, tx = prisma) {
  return tx.billetera.create({
    data: {
      usuarioId,
      saldoSoles: 0,
      vigenteHasta: null,
      bloqueada: false,
    },
  });
}

async function getByUsuarioId(usuarioId) {
  return prisma.billetera.findUnique({
    where: { usuarioId },
  });
}

/**
 * Recalcula saldo y vigencia a partir de recargas completadas no expiradas.
 */
async function recalcularDesdeRecargas(billeteraId) {
  const now = new Date();
  const recargas = await prisma.recarga.findMany({
    where: {
      billeteraId,
      estado: 'completada',
      expiresAt: { gt: now },
      montoRestante: { gt: 0 },
    },
  });

  let saldo = 0;
  let vigenteHasta = null;

  for (const r of recargas) {
    saldo += Number(r.montoRestante);
    if (!vigenteHasta || r.expiresAt > vigenteHasta) {
      vigenteHasta = r.expiresAt;
    }
  }

  return prisma.billetera.update({
    where: { id: billeteraId },
    data: {
      saldoSoles: saldo.toFixed(2),
      vigenteHasta,
    },
  });
}

module.exports = {
  serializeBilletera,
  createBilleteraForUsuario,
  getByUsuarioId,
  recalcularDesdeRecargas,
};
