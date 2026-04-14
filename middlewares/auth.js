const jwt = require('jsonwebtoken');
const { ROLES } = require('../config/constants');
const { AppError } = require('./errorHandler');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token =
        authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    if (!token) {
        return next(new AppError('Token requerido', 401, 'NO_TOKEN'));
    }

    if (!process.env.JWT_SECRET) {
        console.error('[oa-api] JWT_SECRET is not configured');
        return next(new AppError('Error de configuración del servidor', 500, 'CONFIG_ERROR'));
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return next(new AppError('Token expirado', 401, 'TOKEN_EXPIRED'));
            }
            if (err.name === 'NotBeforeError') {
                return next(new AppError('Token aún no válido', 403, 'TOKEN_NOT_ACTIVE'));
            }
            return next(new AppError('Token inválido', 403, 'TOKEN_INVALID'));
        }

        if (!payload.id || !payload.rol) {
            return next(new AppError('Token con formato inválido', 403, 'TOKEN_FORMAT_INVALID'));
        }

        req.user = payload;
        next();
    });
};

/** Alias explícito para rutas protegidas por JWT. */
const authMiddleware = authenticateToken;

const authorizeRole = (roles) => (req, res, next) => {
    if (!req.user) {
        return next(new AppError('No autenticado', 401, 'NOT_AUTHENTICATED'));
    }

    const allowed = Array.isArray(roles) ? roles : [roles];
    if (!allowed.includes(req.user.rol)) {
        return next(
            new AppError('No autorizado para este recurso', 403, 'INSUFFICIENT_ROLE', {
                requiredRoles: allowed,
                userRole: req.user.rol,
            }),
        );
    }

    next();
};

/**
 * Encadena verificación JWT + roles permitidos.
 * Uso: router.get('/ruta', ...roleMiddleware([ROLES.ADMIN]), handler)
 */
const roleMiddleware = (roles) => [authenticateToken, authorizeRole(roles)];

const requireAdmin = roleMiddleware([ROLES.ADMIN]);

module.exports = {
    authenticateToken,
    authMiddleware,
    authorizeRole,
    roleMiddleware,
    requireAdmin,
};
