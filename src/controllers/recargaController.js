const {
  acreditarRecargaPorDni,
  serializeRecarga,
} = require('../services/recargaService');
const { serializeUsuario } = require('../services/usuarioService');

/**
 * POST body (n8n):
 * {
 *   "monto_pago": 10,
 *   "fecha": "2026-07-23T12:00:00.000Z",
 *   "destino": "Yape",
 *   "codigo_seguridad": "1234",
 *   "numero_operacion": "ABC123",
 *   "dni": "74895426"
 * }
 */
async function create(req, res, next) {
  try {
    const {
      monto_pago,
      fecha,
      destino,
      codigo_seguridad,
      numero_operacion,
      dni,
    } = req.body || {};

    const { recarga, usuario } = await acreditarRecargaPorDni({
      monto_pago,
      fecha,
      destino,
      codigo_seguridad,
      numero_operacion,
      dni,
    });

    return res.status(201).json({
      message: 'Recarga acreditada',
      recarga: serializeRecarga(recarga),
      usuario: serializeUsuario(usuario),
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  create,
};
