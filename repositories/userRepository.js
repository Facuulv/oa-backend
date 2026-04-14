const db = require('../config/database');

const PUBLIC_FIELDS = 'id, nombre, apellido, email, telefono, rol, activo, fecha_creacion';

const mapRowToPublic = (row) => {
    if (!row) return null;
    return {
        id: row.id,
        nombre: row.nombre,
        apellido: row.apellido,
        email: row.email,
        telefono: row.telefono,
        rol: row.rol,
        activo: Boolean(row.activo),
        fecha_creacion: row.fecha_creacion,
    };
};

const findByEmailWithHash = async (email) => {
    const [rows] = await db.execute(
        `SELECT id, nombre, apellido, email, telefono, password_hash, rol, activo, fecha_creacion
         FROM usuarios WHERE email = ? LIMIT 1`,
        [email],
    );
    return rows[0] || null;
};

const findByIdPublic = async (id) => {
    const [rows] = await db.execute(
        `SELECT ${PUBLIC_FIELDS} FROM usuarios WHERE id = ? AND activo = 1 LIMIT 1`,
        [id],
    );
    return mapRowToPublic(rows[0]);
};

const emailExists = async (email) => {
    const [rows] = await db.execute('SELECT id FROM usuarios WHERE email = ? LIMIT 1', [email]);
    return rows.length > 0;
};

const insertCliente = async ({ nombre, apellido, email, telefono, passwordHash }) => {
    const [result] = await db.execute(
        `INSERT INTO usuarios (nombre, apellido, email, telefono, password_hash, rol)
         VALUES (?, ?, ?, ?, ?, 'CLIENTE')`,
        [nombre, apellido, email, telefono || null, passwordHash],
    );
    return result.insertId;
};

const insertUser = async ({ nombre, apellido, email, telefono, passwordHash, rol }) => {
    const [result] = await db.execute(
        `INSERT INTO usuarios (nombre, apellido, email, telefono, password_hash, rol)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [nombre, apellido, email, telefono || null, passwordHash, rol],
    );
    return result.insertId;
};

module.exports = {
    mapRowToPublic,
    findByEmailWithHash,
    findByIdPublic,
    emailExists,
    insertCliente,
    insertUser,
    PUBLIC_FIELDS,
};
