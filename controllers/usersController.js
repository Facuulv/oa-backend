const asyncHandler = require('../utils/asyncHandler');
const adminUsuariosService = require('../services/adminUsuariosService');

exports.list = asyncHandler(async (req, res) => {
    const { page, limit, q, rol, activo } = req.validatedQuery;
    const activoFilter = activo === '1' ? true : activo === '0' ? false : undefined;

    const { data, pagination } = await adminUsuariosService.list({
        page,
        limit,
        search: q,
        rol,
        activo: activoFilter,
    });

    res.json({ ok: true, data, pagination });
});

exports.getById = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    const usuario = await adminUsuariosService.getById(id);
    res.json({ ok: true, data: usuario });
});

exports.create = asyncHandler(async (req, res) => {
    const usuario = await adminUsuariosService.create(req.validatedData);
    res.status(201).json({ ok: true, data: usuario });
});

exports.update = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    const usuario = await adminUsuariosService.update(req.auth.id, id, req.validatedData);
    res.json({ ok: true, data: usuario, message: 'Usuario actualizado' });
});

exports.changePassword = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    const usuario = await adminUsuariosService.changePassword(id, req.validatedData.password);
    res.json({ ok: true, data: usuario });
});

exports.remove = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    const usuario = await adminUsuariosService.deactivate(req.auth.id, id);
    res.json({ ok: true, data: usuario, message: 'Usuario desactivado' });
});
