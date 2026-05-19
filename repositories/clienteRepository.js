const db = require('../config/database');
const { formatDateOnly } = require('../utils/mapClienteMe');

const PUBLIC_FIELDS =
    'id, nombre, apellido, dni, email, telefono, fecha_nacimiento, activo, fecha_creacion';

const mapRowToPublic = (row) => {
    if (!row) return null;
    return {
        id: row.id,
        nombre: row.nombre,
        apellido: row.apellido,
        dni: row.dni ?? null,
        email: row.email,
        telefono: row.telefono,
        fecha_nacimiento: formatDateOnly(row.fecha_nacimiento),
        activo: Boolean(row.activo),
        fecha_creacion: row.fecha_creacion,
    };
};

const findByEmailWithHash = async (email) => {
    const [rows] = await db.execute(
        `SELECT id, nombre, apellido, dni, email, telefono, fecha_nacimiento, password_hash, activo, fecha_creacion
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

const dniExists = async (dni) => {
    if (dni === null || dni === undefined || String(dni).trim() === '') return false;
    const [rows] = await db.execute('SELECT id FROM clientes WHERE dni = ? LIMIT 1', [String(dni).trim()]);
    return rows.length > 0;
};

const dniExistsExcluding = async (dni, excludeId) => {
    if (dni === null || dni === undefined || String(dni).trim() === '') return false;
    const [rows] = await db.execute('SELECT id FROM clientes WHERE dni = ? AND id <> ? LIMIT 1', [
        String(dni).trim(),
        excludeId,
    ]);
    return rows.length > 0;
};

const insertCliente = async ({ nombre, apellido, dni, email, telefono, fecha_nacimiento, passwordHash }) => {
    const [result] = await db.execute(
        `INSERT INTO clientes (nombre, apellido, dni, email, telefono, fecha_nacimiento, password_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            nombre,
            apellido,
            String(dni).trim(),
            email,
            telefono || null,
            fecha_nacimiento || null,
            passwordHash,
        ],
    );
    return result.insertId;
};

const updateCliente = async (id, fields) => {
    const allowed = ['nombre', 'apellido', 'dni', 'telefono', 'fecha_nacimiento'];
    const setClauses = [];
    const values = [];

    for (const key of allowed) {
        if (fields[key] !== undefined) {
            setClauses.push(`${key} = ?`);
            if (key === 'dni') {
                values.push(String(fields[key]).trim());
            } else if (key === 'fecha_nacimiento') {
                const v = fields[key];
                values.push(v === null || v === undefined ? null : formatDateOnly(v));
            } else if (key === 'telefono') {
                const v = fields[key];
                values.push(v === null || v === undefined || String(v).trim() === '' ? null : String(v).trim());
            } else {
                values.push(fields[key]);
            }
        }
    }

    if (setClauses.length === 0) return 0;

    setClauses.push('fecha_modificacion = CURRENT_TIMESTAMP');
    values.push(id);

    const [result] = await db.execute(
        `UPDATE clientes SET ${setClauses.join(', ')} WHERE id = ?`,
        values,
    );
    return result.affectedRows;
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
    dniExists,
    dniExistsExcluding,
    insertCliente,
    updateCliente,
    saveResetPasswordToken,
    findByResetPasswordToken,
    updatePasswordAndClearResetToken,
    PUBLIC_FIELDS,
};
