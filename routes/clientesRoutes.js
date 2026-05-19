const express = require('express');
const router = express.Router();
const clientesAuthController = require('../controllers/clientesAuthController');
const clientesCombosController = require('../controllers/clientesCombosController');
const { apiRateLimiter } = require('../middlewares/rateLimit');
const { validate, validateParams } = require('../middlewares/validate');
const { authenticateCliente } = require('../middlewares/auth');
const { registerClienteCookieSchema } = require('../validators/clientesAuthValidators');
const { updateClienteProfileSchema } = require('../validators/clientesProfileValidators');
const { comboPayloadSchema } = require('../validators/clientesCombosValidators');
const { idParamSchema } = require('../validators/common');

/**
 * Registro público de cliente. Login, logout y sesión unificados en `/auth/*`.
 */
router.post(
    '/register',
    apiRateLimiter,
    validate(registerClienteCookieSchema),
    clientesAuthController.register,
);

router.patch(
    '/me',
    apiRateLimiter,
    authenticateCliente,
    validate(updateClienteProfileSchema),
    clientesAuthController.patchMe,
);

router.get('/me/combos', apiRateLimiter, authenticateCliente, clientesCombosController.listMe);
router.post(
    '/me/combos',
    apiRateLimiter,
    authenticateCliente,
    validate(comboPayloadSchema),
    clientesCombosController.createMe,
);
router.delete(
    '/me/combos/:id',
    apiRateLimiter,
    authenticateCliente,
    validateParams(idParamSchema),
    clientesCombosController.deleteMe,
);

module.exports = router;
