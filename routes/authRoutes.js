const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateSession } = require('../middlewares/auth');
const { loginRateLimiter, apiRateLimiter } = require('../middlewares/rateLimit');
const { validate } = require('../middlewares/validate');
const { loginSchema, registerSchema } = require('../validators/authValidators');

router.post('/register', apiRateLimiter, validate(registerSchema), authController.register);
router.post('/login', loginRateLimiter, validate(loginSchema), authController.login);
router.post('/logout', apiRateLimiter, authController.logout);
router.get('/me', apiRateLimiter, authenticateSession, authController.me);

module.exports = router;
