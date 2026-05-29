const asyncHandler = require('../utils/asyncHandler');
const storeScheduleService = require('../services/storeScheduleService');
const configuracionPublicaService = require('../services/configuracionPublicaService');

exports.getEstado = asyncHandler(async (_req, res) => {
    const estado = await storeScheduleService.getEstadoTienda();
    res.json({ data: storeScheduleService.toPublicEstado(estado) });
});

exports.getConfig = asyncHandler(async (_req, res) => {
    const config = await configuracionPublicaService.getPublicConfig();
    res.json({ data: config });
});
