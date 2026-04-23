const db = require('../config/database');

/**
 * mysql2 `pool.execute()` serializes JS numbers as MySQL DOUBLE; from MySQL 8.0.22 onward
 * LIMIT/OFFSET placeholders expect integer parameters and can fail with ER_WRONG_ARGUMENTS.
 * Decimal string literals are accepted as integers by the server.
 * @param {number} limit
 * @param {number} offset
 * @returns {[string, string]}
 */
const limitOffsetPreparedArgs = (limit, offset) => [String(limit), String(offset)];

const JOIN_CATEGORIA = 'LEFT JOIN categorias c ON p.categoria_id = c.id';

const COLUMNAS_ADMIN = `p.id,
    p.categoria_id,
    p.nombre,
    p.descripcion,
    p.precio,
    p.stock,
    p.imagen_url,
    p.destacado,
    p.disponible,
    p.activo,
    p.orden,
    p.fecha_creacion,
    p.fecha_modificacion,
    c.nombre AS categoria_nombre,
    c.activo AS categoria_activo`;

const COLUMNAS_PUBLIC = `p.id,
    p.categoria_id AS category_id,
    p.nombre AS name,
    p.descripcion AS description,
    p.precio AS price,
    p.stock,
    p.imagen_url,
    p.destacado AS featured,
    p.disponible AS available,
    p.activo AS active,
    p.orden AS sort_order,
    p.fecha_creacion AS created_at,
    p.fecha_modificacion AS updated_at,
    c.nombre AS category_name`;

const SORT_SQL = {
    nombre_asc: 'p.nombre ASC, p.id ASC',
    nombre_desc: 'p.nombre DESC, p.id DESC',
    precio_asc: 'p.precio ASC, p.id ASC',
    precio_desc: 'p.precio DESC, p.id DESC',
    fecha_desc: 'p.fecha_creacion DESC, p.id DESC',
    fecha_asc: 'p.fecha_creacion ASC, p.id ASC',
    orden_asc: 'p.orden ASC, p.nombre ASC, p.id ASC',
    orden_desc: 'p.orden DESC, p.nombre ASC, p.id DESC',
};

/**
 * @param {object} filters
 * @param {string} [filters.busqueda]
 * @param {number} [filters.categoria_id]
 * @param {boolean} [filters.activo]
 * @param {boolean} [filters.destacado]
 * @param {boolean} [filters.disponible]
 * @param {string} [filters.ordenar]
 * @param {number} limit
 * @param {number} offset
 * @returns {Promise<{ where: string, params: unknown[] }>}
 */
const buildAdminListClause = (filters) => {
    const params = [];
    let where = 'WHERE 1=1';

    if (filters.busqueda) {
        where += ' AND p.nombre LIKE ?';
        params.push(`%${filters.busqueda}%`);
    }
    if (filters.categoria_id != null) {
        where += ' AND p.categoria_id = ?';
        params.push(filters.categoria_id);
    }
    if (filters.activo != null) {
        where += ' AND p.activo = ?';
        params.push(filters.activo ? 1 : 0);
    }
    if (filters.destacado != null) {
        where += ' AND p.destacado = ?';
        params.push(filters.destacado ? 1 : 0);
    }
    if (filters.disponible != null) {
        where += ' AND p.disponible = ?';
        params.push(filters.disponible ? 1 : 0);
    }

    const orderBy = SORT_SQL[filters.ordenar] ?? SORT_SQL.orden_asc;

    return { where, params, orderBy };
};

/**
 * Listado administrativo con categoría (incluye productos inactivos).
 * @param {object} filters
 * @param {number} limit
 * @param {number} offset
 * @returns {Promise<object[]>}
 */
const listarAdmin = async (filters, limit, offset) => {
    const { where, params, orderBy } = buildAdminListClause(filters);
    const lim = Math.min(Math.max(Math.trunc(Number(limit)) || 20, 1), 100);
    const off = Math.max(Math.trunc(Number(offset)) || 0, 0);
    const [rows] = await db.execute(
        `SELECT ${COLUMNAS_ADMIN}
         FROM productos p
         ${JOIN_CATEGORIA}
         ${where}
         ORDER BY ${orderBy}
         LIMIT ? OFFSET ?`,
        [...params, ...limitOffsetPreparedArgs(lim, off)],
    );
    return rows;
};

/**
 * @param {object} filters
 * @returns {Promise<number>}
 */
const contarAdmin = async (filters) => {
    const { where, params } = buildAdminListClause(filters);
    const [rows] = await db.execute(`SELECT COUNT(*) AS total FROM productos p ${where}`, params);
    const n = rows[0]?.total;
    return typeof n === 'bigint' ? Number(n) : Number(n) || 0;
};

/**
 * @param {number} id
 * @returns {Promise<object|null>}
 */
const buscarPorIdAdmin = async (id) => {
    const [rows] = await db.execute(
        `SELECT ${COLUMNAS_ADMIN}
         FROM productos p
         ${JOIN_CATEGORIA}
         WHERE p.id = ?
         LIMIT 1`,
        [id],
    );
    return rows[0] || null;
};

/**
 * Catálogo público: solo activos.
 * @param {{ categoryId?: number|string, featured?: boolean, search?: string }} filters
 * @param {number} limit
 * @param {number} offset
 * @returns {Promise<object[]>}
 */
const listarPublicos = async (filters, limit, offset) => {
    let where = 'WHERE p.activo = 1';
    const params = [];

    if (filters.categoryId) {
        where += ' AND p.categoria_id = ?';
        params.push(Number(filters.categoryId));
    }
    if (filters.featured === true) {
        where += ' AND p.destacado = 1';
    }
    if (filters.search) {
        where += ' AND (p.nombre LIKE ? OR p.descripcion LIKE ?)';
        params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    const lim = Math.min(Math.max(Math.trunc(Number(limit)) || 20, 1), 100);
    const off = Math.max(Math.trunc(Number(offset)) || 0, 0);

    const [rows] = await db.execute(
        `SELECT ${COLUMNAS_PUBLIC}
         FROM productos p
         ${JOIN_CATEGORIA}
         ${where}
         ORDER BY p.orden ASC, p.nombre ASC
         LIMIT ? OFFSET ?`,
        [...params, ...limitOffsetPreparedArgs(lim, off)],
    );
    return rows;
};

/**
 * @param {{ categoryId?: number|string, featured?: boolean, search?: string }} filters
 * @returns {Promise<number>}
 */
const contarPublicos = async (filters) => {
    let where = 'WHERE p.activo = 1';
    const params = [];

    if (filters.categoryId) {
        where += ' AND p.categoria_id = ?';
        params.push(Number(filters.categoryId));
    }
    if (filters.featured === true) {
        where += ' AND p.destacado = 1';
    }
    if (filters.search) {
        where += ' AND (p.nombre LIKE ? OR p.descripcion LIKE ?)';
        params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    const [rows] = await db.execute(`SELECT COUNT(*) AS total FROM productos p ${where}`, params);
    const n = rows[0]?.total;
    return typeof n === 'bigint' ? Number(n) : Number(n) || 0;
};

/**
 * Detalle público: solo si está activo en catálogo.
 * @param {number} id
 * @returns {Promise<object|null>}
 */
const buscarPublicoPorId = async (id) => {
    const [rows] = await db.execute(
        `SELECT ${COLUMNAS_PUBLIC}
         FROM productos p
         ${JOIN_CATEGORIA}
         WHERE p.id = ? AND p.activo = 1
         LIMIT 1`,
        [id],
    );
    return rows[0] || null;
};

/**
 * @param {{
 *   categoria_id: number,
 *   nombre: string,
 *   descripcion?: string|null,
 *   precio: number,
 *   stock: number,
 *   imagen_url?: string|null,
 *   destacado?: boolean,
 *   disponible?: boolean,
 *   activo?: boolean,
 *   orden?: number,
 * }} datos
 * @returns {Promise<number>}
 */
const crear = async ({
    categoria_id,
    nombre,
    descripcion = null,
    precio,
    stock,
    imagen_url = null,
    destacado = false,
    disponible = true,
    activo = true,
    orden = 0,
}) => {
    const [result] = await db.execute(
        `INSERT INTO productos (
            categoria_id, nombre, descripcion, precio, stock,
            imagen_url, destacado, disponible, activo, orden
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            categoria_id,
            nombre,
            descripcion,
            precio,
            stock,
            imagen_url,
            destacado ? 1 : 0,
            disponible ? 1 : 0,
            activo ? 1 : 0,
            orden,
        ],
    );
    return result.insertId;
};

/**
 * @param {number} id
 * @param {Record<string, unknown>} campos claves en español / snake_case de BD
 * @returns {Promise<number>}
 */
const actualizar = async (id, campos) => {
    const permitidos = [
        'categoria_id',
        'nombre',
        'descripcion',
        'precio',
        'stock',
        'imagen_url',
        'destacado',
        'disponible',
        'activo',
        'orden',
    ];
    const setClauses = [];
    const values = [];

    for (const col of permitidos) {
        if (Object.prototype.hasOwnProperty.call(campos, col)) {
            setClauses.push(`${col} = ?`);
            const v = campos[col];
            if (typeof v === 'boolean') {
                values.push(v ? 1 : 0);
            } else {
                values.push(v);
            }
        }
    }

    if (setClauses.length === 0) {
        return 0;
    }

    setClauses.push('fecha_modificacion = CURRENT_TIMESTAMP');
    values.push(id);
    const [result] = await db.execute(`UPDATE productos SET ${setClauses.join(', ')} WHERE id = ?`, values);
    return result.affectedRows ?? 0;
};

/**
 * @param {number} id
 * @param {boolean} activo
 * @returns {Promise<number>}
 */
const actualizarActivo = async (id, activo) => {
    const [result] = await db.execute(
        'UPDATE productos SET activo = ?, fecha_modificacion = CURRENT_TIMESTAMP WHERE id = ?',
        [activo ? 1 : 0, id],
    );
    return result.affectedRows ?? 0;
};

/**
 * Baja lógica del catálogo (conserva fila e historial de pedidos).
 * @param {number} id
 * @returns {Promise<void>}
 */
const desactivar = async (id) => {
    await db.execute(
        'UPDATE productos SET activo = 0, fecha_modificacion = CURRENT_TIMESTAMP WHERE id = ?',
        [id],
    );
};

module.exports = {
    listarAdmin,
    contarAdmin,
    buscarPorIdAdmin,
    listarPublicos,
    contarPublicos,
    buscarPublicoPorId,
    crear,
    actualizar,
    actualizarActivo,
    desactivar,
};
