const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminCategoriasRoutes = require('./adminCategoriasRoutes');
const adminProductosRoutes = require('./adminProductosRoutes');
const adminPromocionesProductoRoutes = require('./adminPromocionesProductoRoutes');
const { requireAdmin, requireAdminOrEncargado } = require('../middlewares/auth');
const { apiRateLimiter } = require('../middlewares/rateLimit');

router.use('/categorias', apiRateLimiter, ...requireAdminOrEncargado, adminCategoriasRoutes);
router.use('/productos', apiRateLimiter, ...requireAdminOrEncargado, adminProductosRoutes);
router.use('/promociones-producto', apiRateLimiter, ...requireAdminOrEncargado, adminPromocionesProductoRoutes);

router.get('/dashboard', apiRateLimiter, ...requireAdminOrEncargado, adminController.dashboard);
router.get('/settings', apiRateLimiter, ...requireAdmin, adminController.getSettings);
router.put('/settings', apiRateLimiter, ...requireAdmin, adminController.updateSetting);

module.exports = router;
