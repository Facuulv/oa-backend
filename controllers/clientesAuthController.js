const asyncHandler = require('../utils/asyncHandler');
const clienteAuthService = require('../services/clienteAuthService');
const {
    clientSessionCookieName,
    clientSessionCookieOptions,
    clearAllSessionCookies,
} = require('../config/authCookie');
const { mapClienteMe } = require('../utils/mapClienteMe');

/**
 * @deprecated Preferir `POST /auth/register`. Se mantiene por compatibilidad con clientes existentes.
 */
exports.register = asyncHandler(async (req, res) => {
    const { useCookie, ...body } = req.validatedData;
    const { token, expiresIn, cliente } = await clienteAuthService.registerCliente(body);

    clearAllSessionCookies(res);

    if (useCookie) {
        res.cookie(clientSessionCookieName(), token, clientSessionCookieOptions());
        return res.status(201).json({
            ok: true,
            expiresIn,
            usuario: mapClienteMe(cliente),
        });
    }

    res.status(201).json({
        ok: true,
        token,
        expiresIn,
        usuario: mapClienteMe(cliente),
    });
});

exports.patchMe = asyncHandler(async (req, res) => {
    const cliente = await clienteAuthService.updateClienteProfile(req.auth.id, req.validatedData);
    res.json({ ok: true, usuario: mapClienteMe(cliente) });
});
