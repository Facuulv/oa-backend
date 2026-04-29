const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const { requireAdmin } = require('../middlewares/auth');
const { apiRateLimiter } = require('../middlewares/rateLimit');
const { validate, validateParams, validateQuery } = require('../middlewares/validate');
const {
    createUserSchema,
    updateUserSchema,
    changePasswordSchema,
    listUsuariosQuerySchema,
} = require('../validators/usersValidators');
const { idParamSchema } = require('../validators/common');

router.get('/', apiRateLimiter, ...requireAdmin, validateQuery(listUsuariosQuerySchema), usersController.list);
router.post('/', apiRateLimiter, ...requireAdmin, validate(createUserSchema), usersController.create);
router.patch(
    '/:id/password',
    apiRateLimiter,
    ...requireAdmin,
    validateParams(idParamSchema),
    validate(changePasswordSchema),
    usersController.changePassword,
);
router.put(
    '/:id',
    apiRateLimiter,
    ...requireAdmin,
    validateParams(idParamSchema),
    validate(updateUserSchema),
    usersController.update,
);
router.get('/:id', apiRateLimiter, ...requireAdmin, validateParams(idParamSchema), usersController.getById);
router.delete('/:id', apiRateLimiter, ...requireAdmin, validateParams(idParamSchema), usersController.remove);

module.exports = router;
