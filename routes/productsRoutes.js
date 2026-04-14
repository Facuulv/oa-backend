const express = require('express');
const router = express.Router();
const productsController = require('../controllers/productsController');
const { requireAdmin } = require('../middlewares/auth');
const { apiRateLimiter } = require('../middlewares/rateLimit');
const { validate, validateParams } = require('../middlewares/validate');
const { createProductSchema, updateProductSchema } = require('../validators/productsValidators');
const { idParamSchema } = require('../validators/common');

router.get('/', apiRateLimiter, ...requireAdmin, productsController.list);
router.post('/upload-image', apiRateLimiter, ...requireAdmin, ...productsController.uploadImage);
router.delete('/image', apiRateLimiter, ...requireAdmin, productsController.deleteImage);
router.get('/:id', apiRateLimiter, ...requireAdmin, validateParams(idParamSchema), productsController.getById);
router.post('/', apiRateLimiter, ...requireAdmin, validate(createProductSchema), productsController.create);
router.put(
    '/:id',
    apiRateLimiter,
    ...requireAdmin,
    validateParams(idParamSchema),
    validate(updateProductSchema),
    productsController.update,
);
router.delete('/:id', apiRateLimiter, ...requireAdmin, validateParams(idParamSchema), productsController.remove);

module.exports = router;
