const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middlewares/auth');
const { loginRateLimiter, apiRateLimiter } = require('../middlewares/rateLimit');
const { validate } = require('../middlewares/validate');
const { loginSchema, registerSchema } = require('../validators/authValidators');

router.post('/register', apiRateLimiter, validate(registerSchema), authController.register);
router.post('/login', loginRateLimiter, validate(loginSchema), authController.login);
router.get('/me', apiRateLimiter, authMiddleware, authController.me);

module.exports = router;
