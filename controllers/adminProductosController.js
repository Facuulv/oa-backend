const asyncHandler = require('../utils/asyncHandler');
const adminProductosService = require('../services/adminProductosService');

exports.listar = asyncHandler(async (req, res) => {
    const { productos, pagination } = await adminProductosService.listar(req.validatedQuery);
    res.json({ data: productos, pagination });
});

exports.obtener = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    const data = await adminProductosService.obtenerPorId(id);
    res.json({ data });
});

exports.crear = asyncHandler(async (req, res) => {
    const data = await adminProductosService.crear(req.validatedData);
    res.status(201).json({ data });
});

exports.actualizar = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    const data = await adminProductosService.actualizar(id, req.validatedData);
    res.json({ data });
});

exports.actualizarEstado = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    const { activo } = req.validatedData;
    const data = await adminProductosService.actualizarEstado(id, activo);
    res.json({ data });
});

exports.desactivar = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    const { producto, mensaje } = await adminProductosService.desactivar(id);
    res.json({
        data: {
            producto,
            mensaje,
        },
    });
});
