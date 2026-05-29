const express = require('express');
const router = express.Router();
const adminConfiguracionController = require('../controllers/adminConfiguracionController');
const { validate } = require('../middlewares/validate');
const {
    updateCartaSettingsSchema,
    updateHorarioDiaSchema,
    updateWhatsappSchema,
    updateEmailRecuperacionSchema,
} = require('../validators/configuracionValidators');

router.get('/', adminConfiguracionController.getConfiguracion);
router.put('/carta', validate(updateCartaSettingsSchema), adminConfiguracionController.updateCarta);
router.put(
    '/horarios/dia',
    validate(updateHorarioDiaSchema),
    adminConfiguracionController.updateHorarioDia,
);
router.put('/whatsapp', validate(updateWhatsappSchema), adminConfiguracionController.updateWhatsapp);
router.get('/email-recuperacion', adminConfiguracionController.getEmailRecuperacion);
router.put(
    '/email-recuperacion',
    validate(updateEmailRecuperacionSchema),
    adminConfiguracionController.updateEmailRecuperacion,
);

module.exports = router;
