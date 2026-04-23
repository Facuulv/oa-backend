const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');
const clienteAuthService = require('./clienteAuthService');
const { TOKEN_EXPIRATION, ROLES, JWT_TOKEN_USE } = require('../config/constants');
const { AppError } = require('../middlewares/errorHandler');

const buildTokenPayload = (user) => ({
    id: user.id,
    tu: JWT_TOKEN_USE.INTERNAL_USER,
    rol: user.rol,
    email: user.email,
    nombre: user.nombre,
    apellido: user.apellido,
    iat: Math.floor(Date.now() / 1000),
});

const signAccessToken = (user) =>
    jwt.sign(buildTokenPayload(user), process.env.JWT_SECRET, {
        expiresIn: TOKEN_EXPIRATION.access,
    });

/**
 * Login unificado (ver `loginUnified`):
 * 1) `usuarios` con rol ADMIN: valida contraseña; si el email es de un admin, no se consulta `clientes`.
 * 2) Si no aplica (1), valida contra `clientes`.
 */
const tryAdminLoginUnified = async (email, password) => {
    const row = await userRepository.findByEmailWithHash(email);
    if (!row || row.rol !== ROLES.ADMIN) {
        return null;
    }

    if (!row.activo || Number(row.activo) === 0) {
        throw new AppError('Cuenta inactiva', 403, 'USER_INACTIVE');
    }

    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) {
        throw new AppError('Credenciales inválidas', 401, 'INVALID_CREDENTIALS');
    }

    const userForToken = {
        id: row.id,
        rol: row.rol,
        email: row.email,
        nombre: row.nombre,
        apellido: row.apellido,
    };

    const usuario = userRepository.mapRowToPublic(row);
    return {
        accessToken: signAccessToken(userForToken),
        expiresIn: TOKEN_EXPIRATION.access,
        usuario: { ...usuario, origen: 'ADMIN' },
        sessionKind: 'admin',
    };
};

const loginUnified = async ({ email, password }) => {
    const adminResult = await tryAdminLoginUnified(email, password);
    if (adminResult) {
        return adminResult;
    }

    const clientResult = await clienteAuthService.loginCliente({ email, password });
    const c = clientResult.cliente;
    return {
        accessToken: clientResult.token,
        expiresIn: clientResult.expiresIn,
        usuario: {
            id: c.id,
            nombre: c.nombre,
            apellido: c.apellido,
            email: c.email,
            telefono: c.telefono,
            activo: c.activo,
            fecha_creacion: c.fecha_creacion,
            rol: ROLES.CLIENTE,
            origen: 'CLIENTE',
        },
        sessionKind: 'client',
    };
};

const getMe = async (userId) => {
    const usuario = await userRepository.findByIdPublic(userId);
    if (!usuario) {
        throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
    }
    return usuario;
};

module.exports = {
    loginUnified,
    getMe,
    signAccessToken,
};
