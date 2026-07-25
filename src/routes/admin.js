const { Router } = require('express');
const multer = require('multer');
const adminController = require('../controllers/adminController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Solo se permiten imágenes'));
    }
    return cb(null, true);
  },
});

const router = Router();

router.post('/login', adminController.login);
router.post('/logout', adminController.logout);
router.get('/me', adminController.requireAdmin, adminController.me);
router.get('/pago', adminController.requireAdmin, adminController.getPago);
router.put(
  '/pago',
  adminController.requireAdmin,
  upload.fields([
    { name: 'qr', maxCount: 1 },
    { name: 'muestra', maxCount: 1 },
  ]),
  adminController.savePago,
);

module.exports = router;
