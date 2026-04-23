const express = require('express');
const router = express.Router();
const adminCategoriasController = require('../controllers/adminCategoriasController');
const { validate, validateParams } = require('../middlewares/validate');
const {
    categoriaIdParamSchema,
    crearCategoriaSchema,
    actualizarCategoriaSchema,
    actualizarEstadoCategoriaSchema,
} = require('../validators/adminCategoriasValidators');

router.get('/', adminCategoriasController.listar);
router.post('/', validate(crearCategoriaSchema), adminCategoriasController.crear);
router.put(
    '/:id',
    validateParams(categoriaIdParamSchema),
    validate(actualizarCategoriaSchema),
    adminCategoriasController.actualizar,
);
router.patch(
    '/:id/estado',
    validateParams(categoriaIdParamSchema),
    validate(actualizarEstadoCategoriaSchema),
    adminCategoriasController.actualizarEstado,
);
router.delete('/:id', validateParams(categoriaIdParamSchema), adminCategoriasController.eliminar);

module.exports = router;
