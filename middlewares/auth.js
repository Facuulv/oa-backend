const jwt = require('jsonwebtoken');
const { ROLES, JWT_TOKEN_USE } = require('../config/constants');
const { adminSessionCookieName, clientSessionCookieName } = require('../config/authCookie');
const { AppError } = require('./errorHandler');
const userRepository = require('../repositories/userRepository');
const clienteRepository = require('../repositories/clienteRepository');

const extractBearerToken = (req) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.slice(7).trim();
    }
    if (typeof authHeader === 'string' && authHeader.trim()) {
        return authHeader.trim();
    }
    return null;
};

/**
 * Sesión interna (tabla `usuarios`): Authorization Bearer, luego cookie admin.
 * No lee la cookie de cliente (evita ambigüedad con el mismo nombre de header).
 */
const extractInternalSessionToken = (req) => {
    const fromHeader = extractBearerToken(req);
    if (fromHeader) return fromHeader;

    const name = adminSessionCookieName();
    const fromCookie = req.cookies?.[name];
    if (typeof fromCookie === 'string' && fromCookie.trim()) {
        return fromCookie.trim();
    }
    return null;
};

/**
 * Sesión tienda (tabla `clientes`): Bearer (JWT `store_client`), luego cookie cliente.
 */
const extractClienteSessionToken = (req) => {
    const fromHeader = extractBearerToken(req);
    if (fromHeader) return fromHeader;

    const name = clientSessionCookieName();
    const fromCookie = req.cookies?.[name];
    if (typeof fromCookie === 'string' && fromCookie.trim()) {
        return fromCookie.trim();
    }
    return null;
};

/**
 * Resolución de token para `/auth/me` y `authenticateSession`:
 * 1) Bearer (cualquier audiencia válida)
 * 2) Cookie de sesión admin (`oa_admin_token` por defecto)
 * 3) Cookie de sesión cliente (`oa_client_token` por defecto)
 *
 * Orden documentado: primero identidad interna, luego cliente (alineado con login unificado).
 */
const extractAnySessionToken = (req) => {
    const bearer = extractBearerToken(req);
    if (bearer) return bearer;

    const adminName = adminSessionCookieName();
    const adminTok = req.cookies?.[adminName];
    if (typeof adminTok === 'string' && adminTok.trim()) return adminTok.trim();

    const clientName = clientSessionCookieName();
    const clientTok = req.cookies?.[clientName];
    if (typeof clientTok === 'string' && clientTok.trim()) return clientTok.trim();

    return null;
};

const attachInternalAuth = (req, usuario) => {
    req.usuario = usuario;
    req.user = {
        id: usuario.id,
        rol: usuario.rol,
        email: usuario.email,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
    };
    req.auth = {
        origen: 'ADMIN',
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        rol: usuario.rol,
        telefono: usuario.telefono,
        activo: usuario.activo,
        fecha_creacion: usuario.fecha_creacion,
    };
};

const attachClienteAuth = (req, cliente) => {
    req.cliente = cliente;
    req.auth = {
        origen: 'CLIENTE',
        id: cliente.id,
        email: cliente.email,
        nombre: cliente.nombre,
        apellido: cliente.apellido,
        rol: ROLES.CLIENTE,
        telefono: cliente.telefono,
        activo: cliente.activo,
        fecha_creacion: cliente.fecha_creacion,
    };
};

const verifyJwtOrFail = (token, next) => {
    if (!process.env.JWT_SECRET) {
        console.error('[oa-api] JWT_SECRET is not configured');
        next(new AppError('Error de configuración del servidor', 500, 'CONFIG_ERROR'));
        return null;
    }

    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            next(new AppError('Sesión expirada', 401, 'TOKEN_EXPIRED'));
        } else if (err.name === 'NotBeforeError') {
            next(new AppError('Sesión aún no válida', 401, 'TOKEN_NOT_ACTIVE'));
        } else {
            next(new AppError('Sesión inválida', 401, 'TOKEN_INVALID'));
        }
        return null;
    }
};

/**
 * JWT `internal_user` + fila en `usuarios`. Asigna `req.auth`, `req.usuario`, `req.user`.
 */
const authenticateUsuario = async (req, res, next) => {
    try {
        const token = extractInternalSessionToken(req);
        if (!token) {
            return next(new AppError('Autenticación requerida', 401, 'NO_SESSION'));
        }

        const payload = verifyJwtOrFail(token, next);
        if (!payload) return;

        if (payload.tu === JWT_TOKEN_USE.STORE_CLIENT) {
            return next(new AppError('Sesión no válida para este recurso', 401, 'TOKEN_WRONG_AUDIENCE'));
        }

        const userId = payload.id;
        if (!userId) {
            return next(new AppError('Token con formato inválido', 401, 'TOKEN_FORMAT_INVALID'));
        }

        const row = await userRepository.findByIdForAuth(userId);
        if (!row) {
            return next(new AppError('Usuario no encontrado', 401, 'USER_NOT_FOUND'));
        }

        if (!row.activo || Number(row.activo) === 0) {
            return next(new AppError('Cuenta inactiva', 403, 'USER_INACTIVE'));
        }

        const usuario = userRepository.mapRowToPublic(row);
        attachInternalAuth(req, usuario);
        next();
    } catch (err) {
        next(err);
    }
};

/**
 * JWT `store_client` + fila en `clientes`. Asigna `req.auth`, `req.cliente`.
 */
const authenticateCliente = async (req, res, next) => {
    try {
        const token = extractClienteSessionToken(req);
        if (!token) {
            return next(new AppError('Autenticación requerida', 401, 'NO_SESSION'));
        }

        const payload = verifyJwtOrFail(token, next);
        if (!payload) return;

        if (payload.tu !== JWT_TOKEN_USE.STORE_CLIENT) {
            return next(new AppError('Sesión no válida para área de cliente', 401, 'TOKEN_WRONG_AUDIENCE'));
        }

        const clienteId = payload.id;
        if (!clienteId) {
            return next(new AppError('Token con formato inválido', 401, 'TOKEN_FORMAT_INVALID'));
        }

        const row = await clienteRepository.findByIdForAuth(clienteId);
        if (!row) {
            return next(new AppError('Cliente no encontrado', 401, 'CLIENT_NOT_FOUND'));
        }

        if (!row.activo || Number(row.activo) === 0) {
            return next(new AppError('Cuenta inactiva', 403, 'CLIENT_INACTIVE'));
        }

        const cliente = clienteRepository.mapRowToPublic(row);
        attachClienteAuth(req, cliente);
        next();
    } catch (err) {
        next(err);
    }
};

/**
 * Admin o cliente según JWT/cookies (ver `extractAnySessionToken`).
 */
const authenticateSession = async (req, res, next) => {
    try {
        const token = extractAnySessionToken(req);
        if (!token) {
            return next(new AppError('Autenticación requerida', 401, 'NO_SESSION'));
        }

        const payload = verifyJwtOrFail(token, next);
        if (!payload) return;

        if (payload.tu === JWT_TOKEN_USE.INTERNAL_USER) {
            const userId = payload.id;
            if (!userId) {
                return next(new AppError('Token con formato inválido', 401, 'TOKEN_FORMAT_INVALID'));
            }

            const row = await userRepository.findByIdForAuth(userId);
            if (!row) {
                return next(new AppError('Usuario no encontrado', 401, 'USER_NOT_FOUND'));
            }

            if (!row.activo || Number(row.activo) === 0) {
                return next(new AppError('Cuenta inactiva', 403, 'USER_INACTIVE'));
            }

            attachInternalAuth(req, userRepository.mapRowToPublic(row));
            return next();
        }

        if (payload.tu === JWT_TOKEN_USE.STORE_CLIENT) {
            const clienteId = payload.id;
            if (!clienteId) {
                return next(new AppError('Token con formato inválido', 401, 'TOKEN_FORMAT_INVALID'));
            }

            const row = await clienteRepository.findByIdForAuth(clienteId);
            if (!row) {
                return next(new AppError('Cliente no encontrado', 401, 'CLIENT_NOT_FOUND'));
            }

            if (!row.activo || Number(row.activo) === 0) {
                return next(new AppError('Cuenta inactiva', 403, 'CLIENT_INACTIVE'));
            }

            attachClienteAuth(req, clienteRepository.mapRowToPublic(row));
            return next();
        }

        return next(new AppError('Sesión inválida', 401, 'TOKEN_INVALID'));
    } catch (err) {
        next(err);
    }
};

/**
 * Si hay JWT válido, adjunta `req.auth` (y aliases). Si no hay token o es inválido/expirado, continúa sin error.
 * Útil para enlazar pedidos públicos a `usuario_id` / `cliente_id` sin exigir sesión.
 */
const optionalAuthenticateSession = async (req, res, next) => {
    try {
        const token = extractAnySessionToken(req);
        if (!token) return next();

        let payload;
        try {
            if (!process.env.JWT_SECRET) return next();
            payload = jwt.verify(token, process.env.JWT_SECRET);
        } catch {
            return next();
        }

        if (payload.tu === JWT_TOKEN_USE.INTERNAL_USER && payload.id) {
            const row = await userRepository.findByIdForAuth(payload.id);
            if (row && row.activo && Number(row.activo) !== 0) {
                attachInternalAuth(req, userRepository.mapRowToPublic(row));
            }
            return next();
        }

        if (payload.tu === JWT_TOKEN_USE.STORE_CLIENT && payload.id) {
            const row = await clienteRepository.findByIdForAuth(payload.id);
            if (row && row.activo && Number(row.activo) !== 0) {
                attachClienteAuth(req, clienteRepository.mapRowToPublic(row));
            }
        }

        next();
    } catch (err) {
        next(err);
    }
};

/** @deprecated Usar `authenticateUsuario`. */
const authenticateToken = authenticateUsuario;

/** Alias legado: solo sesión interna (`usuarios`). */
const authMiddleware = authenticateUsuario;

/**
 * Autorización por rol usando siempre `req.usuario.rol` (origen: base de datos).
 */
const authorizeRole = (roles) => (req, res, next) => {
    const usuario = req.usuario;
    if (!usuario) {
        return next(new AppError('No autenticado', 401, 'NOT_AUTHENTICATED'));
    }

    const allowed = Array.isArray(roles) ? roles : [roles];
    if (!allowed.includes(usuario.rol)) {
        const adminOnly = allowed.length === 1 && allowed[0] === ROLES.ADMIN;
        const message = adminOnly
            ? 'Acceso denegado: se requiere rol de administrador'
            : 'Acceso denegado: no tiene permisos para este recurso';
        return next(
            new AppError(message, 403, 'INSUFFICIENT_ROLE', {
                requiredRoles: allowed,
                userRole: usuario.rol,
            }),
        );
    }

    next();
};

const roleMiddleware = (roles) => [authenticateUsuario, authorizeRole(roles)];

const authorizeAdmin = authorizeRole([ROLES.ADMIN]);

const requireAdmin = [authenticateUsuario, authorizeAdmin];

const requireCliente = [authenticateCliente];

module.exports = {
    extractBearerToken,
    extractInternalSessionToken,
    extractClienteSessionToken,
    extractAnySessionToken,
    authenticateUsuario,
    authenticateCliente,
    authenticateSession,
    optionalAuthenticateSession,
    authenticateToken,
    authMiddleware,
    authorizeRole,
    authorizeAdmin,
    roleMiddleware,
    requireAdmin,
    requireCliente,
};
