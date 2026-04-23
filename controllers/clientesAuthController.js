const asyncHandler = require('../utils/asyncHandler');
const clienteAuthService = require('../services/clienteAuthService');
const {
    clientSessionCookieName,
    clientSessionCookieOptions,
    clearAllSessionCookies,
} = require('../config/authCookie');
const { ROLES } = require('../config/constants');

const mapClienteMe = (c) => ({
    id: c.id,
    email: c.email,
    nombre: c.nombre,
    apellido: c.apellido,
    rol: ROLES.CLIENTE,
    telefono: c.telefono,
    activo: c.activo,
    fecha_creacion: c.fecha_creacion,
    origen: 'CLIENTE',
});

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
