const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/authService');
const clienteAuthService = require('../services/clienteAuthService');
const {
    adminSessionCookieName,
    adminSessionCookieOptions,
    clientSessionCookieName,
    clientSessionCookieOptions,
    clearAllSessionCookies,
} = require('../config/authCookie');
const { ROLES } = require('../config/constants');

const mapUsuarioMe = (u) => ({
    id: u.id,
    email: u.email,
    nombre: u.nombre,
    apellido: u.apellido,
    rol: u.rol,
    telefono: u.telefono,
    activo: u.activo,
    fecha_creacion: u.fecha_creacion,
    origen: 'ADMIN',
});

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
 * Registro tienda (`clientes`). JWT en cookie si `useCookie`, si no en JSON.
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

/**
 * Login unificado: misma credencial contra `usuarios` (solo ADMIN) o `clientes`.
 * JWT solo en cookie httpOnly; el cuerpo no incluye el token.
 */
exports.login = asyncHandler(async (req, res) => {
    const { accessToken, expiresIn, usuario, sessionKind } = await authService.loginUnified(req.validatedData);

    clearAllSessionCookies(res);

    if (sessionKind === 'admin') {
        res.cookie(adminSessionCookieName(), accessToken, adminSessionCookieOptions());
    } else {
        res.cookie(clientSessionCookieName(), accessToken, clientSessionCookieOptions());
    }

    res.json({
        ok: true,
        expiresIn,
        usuario,
    });
});

exports.logout = asyncHandler(async (req, res) => {
    clearAllSessionCookies(res);
    res.json({ ok: true });
});

exports.me = asyncHandler(async (req, res) => {
    if (req.auth?.origen === 'ADMIN') {
        const usuario = await authService.getMe(req.auth.id);
        return res.json({ ok: true, usuario: mapUsuarioMe(usuario) });
    }

    const cliente = await clienteAuthService.getMeCliente(req.auth.id);
    res.json({ ok: true, usuario: mapClienteMe(cliente) });
});
