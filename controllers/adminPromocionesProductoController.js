const asyncHandler = require('../utils/asyncHandler');
const adminPromocionesProductoService = require('../services/adminPromocionesProductoService');

exports.listar = asyncHandler(async (req, res) => {
    const { promociones, pagination } = await adminPromocionesProductoService.listar(req.validatedQuery);
    res.json({ data: promociones, pagination });
});

exports.obtener = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    const data = await adminPromocionesProductoService.obtenerPorId(id);
    res.json({ data });
});

exports.crear = asyncHandler(async (req, res) => {
    const data = await adminPromocionesProductoService.crear(req.validatedData);
    res.status(201).json({ data });
});

exports.actualizar = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    const data = await adminPromocionesProductoService.actualizar(id, req.validatedData);
    res.json({ data });
});

exports.actualizarEstado = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    const { activo } = req.validatedData;
    const data = await adminPromocionesProductoService.actualizarActivo(id, activo);
    res.json({ data });
});
