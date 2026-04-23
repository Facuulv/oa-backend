const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const clienteRepository = require('../repositories/clienteRepository');
const { TOKEN_EXPIRATION, JWT_TOKEN_USE } = require('../config/constants');
const { AppError } = require('../middlewares/errorHandler');

const BCRYPT_ROUNDS = 10;

const buildClienteTokenPayload = (cliente) => ({
    id: cliente.id,
    tu: JWT_TOKEN_USE.STORE_CLIENT,
    email: cliente.email,
    nombre: cliente.nombre,
    apellido: cliente.apellido,
    iat: Math.floor(Date.now() / 1000),
});

const signClienteAccessToken = (cliente) =>
    jwt.sign(buildClienteTokenPayload(cliente), process.env.JWT_SECRET, {
        expiresIn: TOKEN_EXPIRATION.access,
    });

const mapRowToTokenUser = (row) => ({
    id: row.id,
    email: row.email,
    nombre: row.nombre,
    apellido: row.apellido,
});

const verifyClienteCredentials = async ({ email, password }) => {
    const row = await clienteRepository.findByEmailWithHash(email);

    if (!row) {
        throw new AppError('Credenciales inválidas', 401, 'INVALID_CREDENTIALS');
    }

    if (!row.activo || Number(row.activo) === 0) {
        throw new AppError('Cuenta inactiva', 403, 'CLIENT_INACTIVE');
    }

    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) {
        throw new AppError('Credenciales inválidas', 401, 'INVALID_CREDENTIALS');
    }

    return row;
};

const registerCliente = async ({ nombre, apellido, email, password, telefono }) => {
    const exists = await clienteRepository.emailExists(email);
    if (exists) {
        throw new AppError('El email ya está registrado', 409, 'EMAIL_EXISTS');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const id = await clienteRepository.insertCliente({
        nombre,
        apellido,
        email,
        telefono,
        passwordHash,
    });

    const cliente = await clienteRepository.findByIdPublic(id);
    const token = signClienteAccessToken(mapRowToTokenUser(cliente));

    return {
        token,
        expiresIn: TOKEN_EXPIRATION.access,
        cliente,
    };
};

const loginCliente = async ({ email, password }) => {
    const row = await verifyClienteCredentials({ email, password });
    const cliente = clienteRepository.mapRowToPublic(row);
    const token = signClienteAccessToken(mapRowToTokenUser(row));

    return {
        token,
        expiresIn: TOKEN_EXPIRATION.access,
        cliente,
    };
};

const getMeCliente = async (clienteId) => {
    const cliente = await clienteRepository.findByIdPublic(clienteId);
    if (!cliente) {
        throw new AppError('Cliente no encontrado', 404, 'CLIENT_NOT_FOUND');
    }
    return cliente;
};

module.exports = {
    registerCliente,
    loginCliente,
    getMeCliente,
    signClienteAccessToken,
    verifyClienteCredentials,
};
