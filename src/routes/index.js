const { Router } = require('express');
const authRoutes = require('./auth');
const ubicacionesRoutes = require('./ubicaciones');
const pagoRoutes = require('./pago');
const recargasRoutes = require('./recargas');

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'API funcionando' });
});

router.get('/', (req, res) => {
  res.json({ message: 'Bienvenido a la API de Cardumen' });
});

router.use('/auth', authRoutes);
router.use('/ubicaciones', ubicacionesRoutes);
router.use('/pago', pagoRoutes);
router.use('/recargas', recargasRoutes);

module.exports = router;
