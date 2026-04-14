const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../middlewares/auth');
const { apiRateLimiter } = require('../middlewares/rateLimit');

router.get('/dashboard', apiRateLimiter, ...requireAdmin, adminController.dashboard);
router.get('/settings', apiRateLimiter, ...requireAdmin, adminController.getSettings);
router.put('/settings', apiRateLimiter, ...requireAdmin, adminController.updateSetting);

module.exports = router;
