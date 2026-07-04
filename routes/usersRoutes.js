const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const { authenticateUsuario, requireAdmin } = require('../middlewares/auth');
const { apiRateLimiter } = require('../middlewares/rateLimit');
const { validate, validateParams, validateQuery } = require('../middlewares/validate');
const {
    createUserSchema,
    updateUserSchema,
    updateProfileSchema,
    changePasswordSchema,
    changeOwnPasswordSchema,
    listUsuariosQuerySchema,
} = require('../validators/usersValidators');
const { idParamSchema } = require('../validators/common');

router.get('/', apiRateLimiter, ...requireAdmin, validateQuery(listUsuariosQuerySchema), usersController.list);
router.post('/', apiRateLimiter, ...requireAdmin, validate(createUserSchema), usersController.create);

router.get('/me', apiRateLimiter, authenticateUsuario, usersController.getMe);
router.patch('/me', apiRateLimiter, authenticateUsuario, validate(updateProfileSchema), usersController.updateMe);
router.patch(
    '/me/password',
    apiRateLimiter,
    authenticateUsuario,
    validate(changeOwnPasswordSchema),
    usersController.changeOwnPassword,
);

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
