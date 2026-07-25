const { Router } = require('express');
const { requireFirebaseAuth } = require('../middleware/auth');
const ubicacionController = require('../controllers/ubicacionController');

const router = Router();

router.use(requireFirebaseAuth, ubicacionController.requireUsuario);

router.get('/', ubicacionController.list);
router.post('/', ubicacionController.create);
router.delete('/:id', ubicacionController.remove);

module.exports = router;
