const express = require('express');
const router = express.Router();
const categoriesController = require('../controllers/categoriesController');
const productsController = require('../controllers/productsController');
const promotionsController = require('../controllers/promotionsController');
const couponsController = require('../controllers/couponsController');
const ordersController = require('../controllers/ordersController');
const checkoutController = require('../controllers/checkoutController');
const { apiRateLimiter, strictRateLimiter } = require('../middlewares/rateLimit');
const { optionalAuthenticateSession } = require('../middlewares/auth');
const { validate, validateParams } = require('../middlewares/validate');
const { createOrderSchema } = require('../validators/ordersValidators');
const { validateCouponSchema } = require('../validators/couponsValidators');
const { idParamSchema } = require('../validators/common');

router.get('/categories', apiRateLimiter, categoriesController.list);
router.get('/categories/:id', apiRateLimiter, validateParams(idParamSchema), categoriesController.getById);
router.get('/products', apiRateLimiter, productsController.list);
router.get('/products/:id', apiRateLimiter, validateParams(idParamSchema), productsController.getById);
router.get('/promotions', apiRateLimiter, promotionsController.listActive);
router.post('/coupons/validate', apiRateLimiter, validate(validateCouponSchema), couponsController.validateCoupon);
router.post(
    '/orders',
    strictRateLimiter,
    optionalAuthenticateSession,
    validate(createOrderSchema),
    ordersController.create,
);
router.post('/checkout/preference', strictRateLimiter, checkoutController.createPreference);
router.post('/checkout/webhook', checkoutController.webhook);

module.exports = router;
