const express = require('express');
const router = express.Router();
const categoriesController = require('../controllers/categoriesController');
const { requireAdmin } = require('../middlewares/auth');
const { apiRateLimiter } = require('../middlewares/rateLimit');
const { validate, validateParams } = require('../middlewares/validate');
const { createCategorySchema, updateCategorySchema } = require('../validators/categoriesValidators');
const { idParamSchema } = require('../validators/common');

router.get('/', apiRateLimiter, ...requireAdmin, categoriesController.list);
router.get('/:id', apiRateLimiter, ...requireAdmin, validateParams(idParamSchema), categoriesController.getById);
router.post('/', apiRateLimiter, ...requireAdmin, validate(createCategorySchema), categoriesController.create);
router.put(
    '/:id',
    apiRateLimiter,
    ...requireAdmin,
    validateParams(idParamSchema),
    validate(updateCategorySchema),
    categoriesController.update,
);
router.delete('/:id', apiRateLimiter, ...requireAdmin, validateParams(idParamSchema), categoriesController.remove);

module.exports = router;
