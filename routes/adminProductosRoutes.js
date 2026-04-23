const express = require('express');
const router = express.Router();
const adminProductosController = require('../controllers/adminProductosController');
const { validate, validateParams, validateQuery } = require('../middlewares/validate');
const {
    productoIdParamSchema,
    listadoProductosQuerySchema,
    crearProductoSchema,
    actualizarProductoSchema,
    actualizarEstadoProductoSchema,
} = require('../validators/adminProductosValidators');

router.get('/', validateQuery(listadoProductosQuerySchema), adminProductosController.listar);
router.post('/', validate(crearProductoSchema), adminProductosController.crear);
router.get('/:id', validateParams(productoIdParamSchema), adminProductosController.obtener);
router.put(
    '/:id',
    validateParams(productoIdParamSchema),
    validate(actualizarProductoSchema),
    adminProductosController.actualizar,
);
router.patch(
    '/:id/estado',
    validateParams(productoIdParamSchema),
    validate(actualizarEstadoProductoSchema),
    adminProductosController.actualizarEstado,
);
router.delete('/:id', validateParams(productoIdParamSchema), adminProductosController.desactivar);

module.exports = router;
