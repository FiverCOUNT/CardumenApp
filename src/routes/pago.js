const { Router } = require('express');
const { requireFirebaseAuth } = require('../middleware/auth');
const pagoController = require('../controllers/pagoController');

const router = Router();

router.get('/', requireFirebaseAuth, pagoController.getActiva);
/** Público: la app/admin necesitan ver el QR sin auth de imagen */
router.get('/media/:tipo', pagoController.streamMedia);

module.exports = router;
