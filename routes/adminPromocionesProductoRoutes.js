const express = require('express');
const router = express.Router();
const adminPromocionesProductoController = require('../controllers/adminPromocionesProductoController');
const { validate, validateParams, validateQuery } = require('../middlewares/validate');
const {
    productoIdParamSchema,
    listadoPromocionesProductoQuerySchema,
    crearPromocionProductoSchema,
    actualizarPromocionProductoSchema,
    actualizarEstadoProductoSchema,
} = require('../validators/adminPromocionesProductoValidators');

router.get('/', validateQuery(listadoPromocionesProductoQuerySchema), adminPromocionesProductoController.listar);
router.post('/', validate(crearPromocionProductoSchema), adminPromocionesProductoController.crear);
router.get('/:id', validateParams(productoIdParamSchema), adminPromocionesProductoController.obtener);
router.put(
    '/:id',
    validateParams(productoIdParamSchema),
    validate(actualizarPromocionProductoSchema),
    adminPromocionesProductoController.actualizar,
);
router.patch(
    '/:id/estado',
    validateParams(productoIdParamSchema),
    validate(actualizarEstadoProductoSchema),
    adminPromocionesProductoController.actualizarEstado,
);

module.exports = router;
