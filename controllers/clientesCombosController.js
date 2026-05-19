const asyncHandler = require('../utils/asyncHandler');
const clienteCombosService = require('../services/clienteCombosService');

function resolveClienteId(req) {
    return req.cliente?.id ?? (req.auth?.origen === 'CLIENTE' ? req.auth.id : null);
}

exports.listMe = asyncHandler(async (req, res) => {
    const clienteId = resolveClienteId(req);
    const data = await clienteCombosService.listClienteCombos(clienteId);
    res.json({ ok: true, data });
});

exports.createMe = asyncHandler(async (req, res) => {
    const clienteId = resolveClienteId(req);
    const combo = await clienteCombosService.createClienteCombo(clienteId, req.validatedData);
    res.status(201).json({ ok: true, data: combo });
});

exports.deleteMe = asyncHandler(async (req, res) => {
    const clienteId = resolveClienteId(req);
    await clienteCombosService.removeClienteCombo(clienteId, req.validatedParams.id);
    res.json({ ok: true });
});
