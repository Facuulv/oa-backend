const asyncHandler = require('../utils/asyncHandler');
const adminCategoriasService = require('../services/adminCategoriasService');

exports.listar = asyncHandler(async (_req, res) => {
    const data = await adminCategoriasService.listar();
    res.json({ data });
});

exports.crear = asyncHandler(async (req, res) => {
    const data = await adminCategoriasService.crear(req.validatedData);
    res.status(201).json({ data });
});

exports.actualizar = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    const data = await adminCategoriasService.actualizar(id, req.validatedData);
    res.json({ data });
});

exports.actualizarEstado = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    const { activo } = req.validatedData;
    const data = await adminCategoriasService.actualizarEstado(id, activo);
    res.json({ data });
});

exports.eliminar = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    const { categoria, productos_relacionados, mensaje } = await adminCategoriasService.eliminar(id);
    res.json({
        data: {
            categoria,
            productos_relacionados,
            mensaje,
        },
    });
});
