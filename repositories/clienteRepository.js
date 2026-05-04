const db = require('../config/database');

const PUBLIC_FIELDS = 'id, nombre, apellido, email, telefono, activo, fecha_creacion';

const mapRowToPublic = (row) => {
    if (!row) return null;
    return {
        id: row.id,
        nombre: row.nombre,
        apellido: row.apellido,
        email: row.email,
        telefono: row.telefono,
        activo: Boolean(row.activo),
        fecha_creacion: row.fecha_creacion,
    };
};

const findByEmailWithHash = async (email) => {
    const [rows] = await db.execute(
        `SELECT id, nombre, apellido, email, telefono, password_hash, activo, fecha_creacion
         FROM clientes WHERE email = ? LIMIT 1`,
        [email],
    );
    return rows[0] || null;
};

const findByIdPublic = async (id) => {
    const [rows] = await db.execute(
        `SELECT ${PUBLIC_FIELDS} FROM clientes WHERE id = ? AND activo = 1 LIMIT 1`,
        [id],
    );
    return mapRowToPublic(rows[0]);
};

const findByIdForAuth = async (id) => {
    const [rows] = await db.execute(
        `SELECT ${PUBLIC_FIELDS} FROM clientes WHERE id = ? LIMIT 1`,
        [id],
    );
    return rows[0] || null;
};

const emailExists = async (email) => {
    const [rows] = await db.execute('SELECT id FROM clientes WHERE email = ? LIMIT 1', [email]);
    return rows.length > 0;
};

const insertCliente = async ({ nombre, apellido, email, telefono, passwordHash }) => {
    const [result] = await db.execute(
        `INSERT INTO clientes (nombre, apellido, email, telefono, password_hash)
         VALUES (?, ?, ?, ?, ?)`,
        [nombre, apellido, email, telefono || null, passwordHash],
    );
    return result.insertId;
};

const saveResetPasswordToken = async ({ clienteId, tokenHash, expiresAt }) => {
    await db.execute(
        `UPDATE clientes
         SET reset_password_token = ?, reset_password_expira = ?, fecha_modificacion = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [tokenHash, expiresAt, clienteId],
    );
};

const findByResetPasswordToken = async (tokenHash) => {
    const [rows] = await db.execute(
        `SELECT id, email, nombre, apellido, activo, reset_password_expira
         FROM clientes
         WHERE reset_password_token = ?
           AND reset_password_expira IS NOT NULL
           AND reset_password_expira > NOW()
         LIMIT 1`,
        [tokenHash],
    );
    return rows[0] || null;
};

const updatePasswordAndClearResetToken = async ({ clienteId, passwordHash }) => {
    const [result] = await db.execute(
        `UPDATE clientes
         SET password_hash = ?, reset_password_token = NULL, reset_password_expira = NULL, fecha_modificacion = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [passwordHash, clienteId],
    );
    return result.affectedRows > 0;
};

module.exports = {
    mapRowToPublic,
    findByEmailWithHash,
    findByIdPublic,
    findByIdForAuth,
    emailExists,
    insertCliente,
    saveResetPasswordToken,
    findByResetPasswordToken,
    updatePasswordAndClearResetToken,
    PUBLIC_FIELDS,
};
