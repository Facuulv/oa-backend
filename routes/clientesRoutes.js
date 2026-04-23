const express = require('express');
const router = express.Router();
const clientesAuthController = require('../controllers/clientesAuthController');
const { apiRateLimiter } = require('../middlewares/rateLimit');
const { validate } = require('../middlewares/validate');
const { registerClienteCookieSchema } = require('../validators/clientesAuthValidators');

/**
 * Registro público de cliente. Login, logout y sesión unificados en `/auth/*`.
 */
router.post(
    '/register',
    apiRateLimiter,
    validate(registerClienteCookieSchema),
    clientesAuthController.register,
);

module.exports = router;
