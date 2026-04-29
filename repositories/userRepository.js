const db = require('../config/database');
const { PAGINATION } = require('../config/constants');

const PUBLIC_FIELDS =
    'id, nombre, apellido, dni, email, telefono, rol, activo, fecha_creacion, fecha_modificacion';

const mapRowToPublic = (row) => {
    if (!row) return null;
    return {
        id: row.id,
        nombre: row.nombre,
        apellido: row.apellido,
        dni: row.dni ?? null,
        email: row.email,
        telefono: row.telefono,
        rol: row.rol,
        activo: Boolean(row.activo),
        fecha_creacion: row.fecha_creacion,
        fecha_modificacion: row.fecha_modificacion ?? null,
    };
};

const findByEmailWithHash = async (email) => {
    const [rows] = await db.execute(
        `SELECT id, nombre, apellido, dni, email, telefono, password_hash, rol, activo, fecha_creacion, fecha_modificacion
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

/** Fila pública sin filtrar por activo (para validar sesión en middleware). */
const findByIdForAuth = async (id) => {
    const [rows] = await db.execute(`SELECT ${PUBLIC_FIELDS} FROM usuarios WHERE id = ? LIMIT 1`, [id]);
    return rows[0] || null;
};

const findByIdAdmin = async (id) => {
    const [rows] = await db.execute(`SELECT ${PUBLIC_FIELDS} FROM usuarios WHERE id = ? LIMIT 1`, [id]);
    return rows[0] ? mapRowToPublic(rows[0]) : null;
};

const emailExists = async (email) => {
    const [rows] = await db.execute('SELECT id FROM usuarios WHERE email = ? LIMIT 1', [email]);
    return rows.length > 0;
};

const emailExistsExcluding = async (email, excludeId) => {
    const [rows] = await db.execute('SELECT id FROM usuarios WHERE email = ? AND id <> ? LIMIT 1', [
        email,
        excludeId,
    ]);
    return rows.length > 0;
};

const dniExists = async (dni) => {
    if (dni === null || dni === undefined || String(dni).trim() === '') return false;
    const [rows] = await db.execute('SELECT id FROM usuarios WHERE dni = ? LIMIT 1', [String(dni).trim()]);
    return rows.length > 0;
};

const dniExistsExcluding = async (dni, excludeId) => {
    if (dni === null || dni === undefined || String(dni).trim() === '') return false;
    const [rows] = await db.execute('SELECT id FROM usuarios WHERE dni = ? AND id <> ? LIMIT 1', [
        String(dni).trim(),
        excludeId,
    ]);
    return rows.length > 0;
};

const countActiveAdmins = async () => {
    const [rows] = await db.execute(
        `SELECT COUNT(*) AS c FROM usuarios WHERE rol = 'ADMIN' AND activo = 1`,
    );
    return Number(rows[0]?.c || 0);
};

const listUsuarios = async ({ page, limit, search, rol, activo }) => {
    const safeLimit = Math.min(Math.max(Number(limit) || PAGINATION.DEFAULT_LIMIT, 1), PAGINATION.MAX_LIMIT);
    const safePage = Math.max(Number(page) || PAGINATION.DEFAULT_PAGE, 1);
    const offset = (safePage - 1) * safeLimit;

    const conditions = [];
    const params = [];

    if (rol !== undefined && rol !== null && rol !== '') {
        conditions.push('rol = ?');
        params.push(rol);
    }
    if (activo !== undefined && activo !== null && activo !== '') {
        conditions.push('activo = ?');
        params.push(activo ? 1 : 0);
    }
    if (search && String(search).trim()) {
        const term = `%${String(search).trim()}%`;
        conditions.push(
            `(nombre LIKE ? OR apellido LIKE ? OR email LIKE ? OR IFNULL(dni, '') LIKE ? OR IFNULL(telefono, '') LIKE ?)`,
        );
        params.push(term, term, term, term, term);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await db.execute(
        `SELECT ${PUBLIC_FIELDS} FROM usuarios ${where} ORDER BY fecha_creacion DESC, id DESC LIMIT ? OFFSET ?`,
        [...params, String(safeLimit), String(offset)],
    );

    const [countResult] = await db.execute(`SELECT COUNT(*) AS total FROM usuarios ${where}`, params);

    return {
        data: rows.map(mapRowToPublic),
        pagination: {
            page: safePage,
            limit: safeLimit,
            total: Number(countResult[0]?.total || 0),
        },
    };
};

const insertUser = async ({ nombre, apellido, dni, email, telefono, passwordHash, rol, activo = true }) => {
    const [result] = await db.execute(
        `INSERT INTO usuarios (nombre, apellido, dni, email, telefono, password_hash, rol, activo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            nombre,
            apellido,
            dni === undefined || dni === null || String(dni).trim() === '' ? null : String(dni).trim(),
            email,
            telefono || null,
            passwordHash,
            rol,
            activo ? 1 : 0,
        ],
    );
    return result.insertId;
};

const updateUsuario = async (id, fields) => {
    const allowed = ['nombre', 'apellido', 'dni', 'email', 'telefono', 'rol', 'activo'];
    const setClauses = [];
    const values = [];

    for (const key of allowed) {
        if (fields[key] !== undefined) {
            setClauses.push(`${key} = ?`);
            if (key === 'activo') {
                values.push(fields[key] ? 1 : 0);
            } else if (key === 'dni') {
                const v = fields[key];
                values.push(v === null || v === undefined || String(v).trim() === '' ? null : String(v).trim());
            } else {
                values.push(fields[key]);
            }
        }
    }

    if (setClauses.length === 0) {
        return 0;
    }

    setClauses.push('fecha_modificacion = CURRENT_TIMESTAMP');
    values.push(id);
    const [result] = await db.execute(`UPDATE usuarios SET ${setClauses.join(', ')} WHERE id = ?`, values);
    return result.affectedRows;
};

const updatePasswordHash = async (id, passwordHash) => {
    const [result] = await db.execute(
        `UPDATE usuarios SET password_hash = ?, fecha_modificacion = CURRENT_TIMESTAMP WHERE id = ?`,
        [passwordHash, id],
    );
    return result.affectedRows;
};

const setActivo = async (id, activo) => {
    const [result] = await db.execute(
        `UPDATE usuarios SET activo = ?, fecha_modificacion = CURRENT_TIMESTAMP WHERE id = ?`,
        [activo ? 1 : 0, id],
    );
    return result.affectedRows;
};

module.exports = {
    mapRowToPublic,
    findByEmailWithHash,
    findByIdPublic,
    findByIdForAuth,
    findByIdAdmin,
    emailExists,
    emailExistsExcluding,
    dniExists,
    dniExistsExcluding,
    countActiveAdmins,
    listUsuarios,
    insertUser,
    updateUsuario,
    updatePasswordHash,
    setActivo,
    PUBLIC_FIELDS,
};
