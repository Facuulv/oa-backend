const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminCategoriasRoutes = require('./adminCategoriasRoutes');
const adminProductosRoutes = require('./adminProductosRoutes');
const { requireAdmin } = require('../middlewares/auth');
const { apiRateLimiter } = require('../middlewares/rateLimit');

router.use('/categorias', apiRateLimiter, ...requireAdmin, adminCategoriasRoutes);
router.use('/productos', apiRateLimiter, ...requireAdmin, adminProductosRoutes);

router.get('/dashboard', apiRateLimiter, ...requireAdmin, adminController.dashboard);
router.get('/settings', apiRateLimiter, ...requireAdmin, adminController.getSettings);
router.put('/settings', apiRateLimiter, ...requireAdmin, adminController.updateSetting);

module.exports = router;
