const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const { requireAdmin } = require('../middlewares/auth');
const { apiRateLimiter } = require('../middlewares/rateLimit');
const { validate, validateParams } = require('../middlewares/validate');
const { createUserSchema, updateUserSchema } = require('../validators/usersValidators');
const { idParamSchema } = require('../validators/common');

router.get('/', apiRateLimiter, ...requireAdmin, usersController.list);
router.get('/:id', apiRateLimiter, ...requireAdmin, validateParams(idParamSchema), usersController.getById);
router.post('/', apiRateLimiter, ...requireAdmin, validate(createUserSchema), usersController.create);
router.put(
    '/:id',
    apiRateLimiter,
    ...requireAdmin,
    validateParams(idParamSchema),
    validate(updateUserSchema),
    usersController.update,
);
router.delete('/:id', apiRateLimiter, ...requireAdmin, validateParams(idParamSchema), usersController.remove);

module.exports = router;
