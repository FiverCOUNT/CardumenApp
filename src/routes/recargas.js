const { Router } = require('express');
const recargaController = require('../controllers/recargaController');

const router = Router();

/** Webhook / n8n: acredita saldo buscando usuario por DNI */
router.post('/', recargaController.create);

module.exports = router;
