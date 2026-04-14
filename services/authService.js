const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');
const { TOKEN_EXPIRATION } = require('../config/constants');
const { AppError } = require('../middlewares/errorHandler');

const BCRYPT_ROUNDS = 10;

const buildTokenPayload = (user) => ({
    id: user.id,
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

const registerCliente = async ({ nombre, apellido, email, password, telefono }) => {
    const exists = await userRepository.emailExists(email);
    if (exists) {
        throw new AppError('El email ya está registrado', 409, 'EMAIL_EXISTS');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const id = await userRepository.insertCliente({
        nombre,
        apellido,
        email,
        telefono,
        passwordHash,
    });

    const usuario = await userRepository.findByIdPublic(id);
    const token = signAccessToken({
        id: usuario.id,
        rol: usuario.rol,
        email: usuario.email,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
    });

    return {
        token,
        expiresIn: TOKEN_EXPIRATION.access,
        usuario,
    };
};

const login = async ({ email, password }) => {
    const row = await userRepository.findByEmailWithHash(email);

    if (!row || !row.activo) {
        throw new AppError('Credenciales inválidas', 401, 'INVALID_CREDENTIALS');
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

    const token = signAccessToken(userForToken);

    return {
        token,
        expiresIn: TOKEN_EXPIRATION.access,
        usuario: userRepository.mapRowToPublic(row),
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
    registerCliente,
    login,
    getMe,
    signAccessToken,
};
