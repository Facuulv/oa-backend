const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const clienteRepository = require('../repositories/clienteRepository');
const { TOKEN_EXPIRATION, JWT_TOKEN_USE } = require('../config/constants');
const { AppError } = require('../middlewares/errorHandler');
const { sendResetPasswordEmail } = require('./emailService');

const BCRYPT_ROUNDS = 10;
const RESET_TOKEN_EXPIRATION_MS = 60 * 60 * 1000;
const RESET_TOKEN_BYTES = 32;
const FORGOT_PASSWORD_GENERIC_MESSAGE =
    'Si el correo existe, enviaremos un enlace para restablecer tu contraseña.';

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

const hashResetToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const buildResetPasswordUrl = (token) => {
    const frontendUrl = String(process.env.FRONTEND_URL || '').trim();
    if (!frontendUrl) {
        throw new AppError(
            'No se pudo procesar la solicitud de recuperación',
            500,
            'FORGOT_PASSWORD_UNAVAILABLE',
        );
    }

    try {
        const base = frontendUrl.replace(/\/+$/, '');
        const url = new URL(`${base}/auth/reset-password`);
        url.searchParams.set('token', token);
        return url.toString();
    } catch (_error) {
        throw new AppError(
            'No se pudo procesar la solicitud de recuperación',
            500,
            'FORGOT_PASSWORD_UNAVAILABLE',
        );
    }
};

const forgotPasswordCliente = async ({ email }) => {
    buildResetPasswordUrl('config-check');
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const row = await clienteRepository.findByEmailWithHash(normalizedEmail);

    if (!row || !row.activo || Number(row.activo) === 0) {
        return { message: FORGOT_PASSWORD_GENERIC_MESSAGE };
    }

    const rawToken = crypto.randomBytes(RESET_TOKEN_BYTES).toString('hex');
    const tokenHash = hashResetToken(rawToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRATION_MS);
    const resetUrl = buildResetPasswordUrl(rawToken);

    await clienteRepository.saveResetPasswordToken({
        clienteId: row.id,
        tokenHash,
        expiresAt,
    });

    await sendResetPasswordEmail({
        to: row.email,
        nombre: row.nombre,
        resetUrl,
    });

    return { message: FORGOT_PASSWORD_GENERIC_MESSAGE };
};

const resetPasswordCliente = async ({ token, password }) => {
    const tokenHash = hashResetToken(String(token || '').trim());
    const cliente = await clienteRepository.findByResetPasswordToken(tokenHash);

    if (!cliente) {
        throw new AppError('Token inválido o vencido', 400, 'RESET_TOKEN_INVALID_OR_EXPIRED');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const updated = await clienteRepository.updatePasswordAndClearResetToken({
        clienteId: cliente.id,
        passwordHash,
    });

    if (!updated) {
        throw new AppError('No se pudo actualizar la contraseña', 500, 'RESET_PASSWORD_FAILED');
    }
};

module.exports = {
    registerCliente,
    loginCliente,
    getMeCliente,
    forgotPasswordCliente,
    resetPasswordCliente,
    signClienteAccessToken,
    verifyClienteCredentials,
};
