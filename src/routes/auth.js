const { Router } = require('express');
const { requireFirebaseAuth } = require('../middleware/auth');
const authController = require('../controllers/authController');

const router = Router();

router.post('/register', requireFirebaseAuth, authController.register);
router.post('/login', requireFirebaseAuth, authController.login);
router.get('/me', requireFirebaseAuth, authController.me);
router.patch('/preferencias', requireFirebaseAuth, authController.updatePreferencias);

module.exports = router;
