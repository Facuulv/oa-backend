const express = require('express');
const router = express.Router();
const couponsController = require('../controllers/couponsController');
const { requireAdmin } = require('../middlewares/auth');
const { apiRateLimiter } = require('../middlewares/rateLimit');
const { validate, validateParams } = require('../middlewares/validate');
const { createCouponSchema, updateCouponSchema } = require('../validators/couponsValidators');
const { idParamSchema } = require('../validators/common');

router.get('/', apiRateLimiter, ...requireAdmin, couponsController.list);
router.get('/:id', apiRateLimiter, ...requireAdmin, validateParams(idParamSchema), couponsController.getById);
router.post('/', apiRateLimiter, ...requireAdmin, validate(createCouponSchema), couponsController.create);
router.put(
    '/:id',
    apiRateLimiter,
    ...requireAdmin,
    validateParams(idParamSchema),
    validate(updateCouponSchema),
    couponsController.update,
);
router.delete('/:id', apiRateLimiter, ...requireAdmin, validateParams(idParamSchema), couponsController.remove);

module.exports = router;
