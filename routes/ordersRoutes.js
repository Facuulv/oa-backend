const express = require('express');
const router = express.Router();
const ordersController = require('../controllers/ordersController');
const { authMiddleware, requireAdmin } = require('../middlewares/auth');
const { apiRateLimiter } = require('../middlewares/rateLimit');
const { validate, validateParams } = require('../middlewares/validate');
const { updateOrderStatusSchema } = require('../validators/ordersValidators');
const { idParamSchema } = require('../validators/common');

router.get('/me', apiRateLimiter, authMiddleware, ordersController.myOrders);
router.get('/', apiRateLimiter, ...requireAdmin, ordersController.list);
router.get('/:id', apiRateLimiter, ...requireAdmin, validateParams(idParamSchema), ordersController.getById);
router.patch(
    '/:id/status',
    apiRateLimiter,
    ...requireAdmin,
    validateParams(idParamSchema),
    validate(updateOrderStatusSchema),
    ordersController.updateStatus,
);

module.exports = router;
