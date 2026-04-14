const express = require('express');
const router = express.Router();
const promotionsController = require('../controllers/promotionsController');
const { requireAdmin } = require('../middlewares/auth');
const { apiRateLimiter } = require('../middlewares/rateLimit');
const { validate, validateParams } = require('../middlewares/validate');
const { createPromotionSchema, updatePromotionSchema } = require('../validators/promotionsValidators');
const { idParamSchema } = require('../validators/common');

router.get('/', apiRateLimiter, ...requireAdmin, promotionsController.list);
router.get('/:id', apiRateLimiter, ...requireAdmin, validateParams(idParamSchema), promotionsController.getById);
router.post('/', apiRateLimiter, ...requireAdmin, validate(createPromotionSchema), promotionsController.create);
router.put(
    '/:id',
    apiRateLimiter,
    ...requireAdmin,
    validateParams(idParamSchema),
    validate(updatePromotionSchema),
    promotionsController.update,
);
router.delete('/:id', apiRateLimiter, ...requireAdmin, validateParams(idParamSchema), promotionsController.remove);

module.exports = router;
