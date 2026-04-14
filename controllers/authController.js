const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/authService');

exports.register = asyncHandler(async (req, res) => {
    const result = await authService.registerCliente(req.validatedData);
    res.status(201).json(result);
});

exports.login = asyncHandler(async (req, res) => {
    const result = await authService.login(req.validatedData);
    res.json(result);
});

exports.me = asyncHandler(async (req, res) => {
    const usuario = await authService.getMe(req.user.id);
    res.json({ usuario });
});
