const db = require('../config/database');

const COLUMNAS =
    'id, nombre, descripcion, imagen_url, orden, activo, fecha_creacion, fecha_modificacion';

/**
 * Listado administrativo: incluye categorías inactivas.
 * @returns {Promise<object[]>}
 */
const listarTodas = async () => {
    const [rows] = await db.execute(
        `SELECT ${COLUMNAS} FROM categorias ORDER BY orden ASC, id ASC`,
    );
    return rows;
};

/**
 * @param {number} id
 * @returns {Promise<object|null>}
 */
const buscarPorId = async (id) => {
    const [rows] = await db.execute(`SELECT ${COLUMNAS} FROM categorias WHERE id = ? LIMIT 1`, [id]);
    return rows[0] || null;
};

/**
 * Otra fila con el mismo nombre ignorando mayúsculas y espacios extremos (criterio de duplicado del ABM admin).
 * @param {string} nombre
 * @param {number|null} [excluirId] id a excluir (updates)
 * @returns {Promise<number|null>} id de la categoría conflictiva o null
 */
const buscarIdPorNombreNormalizado = async (nombre, excluirId = null) => {
    const sql =
        excluirId == null
            ? `SELECT id FROM categorias WHERE LOWER(TRIM(nombre)) = LOWER(TRIM(?)) LIMIT 1`
            : `SELECT id FROM categorias WHERE LOWER(TRIM(nombre)) = LOWER(TRIM(?)) AND id <> ? LIMIT 1`;
    const params = excluirId == null ? [nombre] : [nombre, excluirId];
    const [rows] = await db.execute(sql, params);
    const id = rows[0]?.id;
    return id != null ? Number(id) : null;
};

/**
 * @param {{ nombre: string, descripcion?: string|null, imagen_url?: string|null, orden?: number, activo?: boolean }} datos
 * @returns {Promise<number>} id insertado
 */
const crear = async ({ nombre, descripcion = null, imagen_url = null, orden = 0, activo = true }) => {
    const [result] = await db.execute(
        'INSERT INTO categorias (nombre, descripcion, imagen_url, orden, activo) VALUES (?, ?, ?, ?, ?)',
        [nombre, descripcion, imagen_url, orden, activo ? 1 : 0],
    );
    return result.insertId;
};

/**
 * @param {number} id
 * @param {Record<string, unknown>} campos columnas en español (nombre, descripcion, imagen_url, orden, activo)
 * @returns {Promise<number>} filas afectadas (0 si no hubo columnas para actualizar)
 */
const actualizar = async (id, campos) => {
    const permitidos = ['nombre', 'descripcion', 'imagen_url', 'orden', 'activo'];
    const setClauses = [];
    const values = [];

    for (const col of permitidos) {
        if (Object.prototype.hasOwnProperty.call(campos, col)) {
            setClauses.push(`${col} = ?`);
            const v = campos[col];
            values.push(typeof v === 'boolean' ? (v ? 1 : 0) : v);
        }
    }

    if (setClauses.length === 0) {
        return 0;
    }

    setClauses.push('fecha_modificacion = CURRENT_TIMESTAMP');
    values.push(id);
    const [result] = await db.execute(`UPDATE categorias SET ${setClauses.join(', ')} WHERE id = ?`, values);
    return result.affectedRows ?? 0;
};

/**
 * @param {number} id
 * @param {boolean} activo
 * @returns {Promise<number>} filas afectadas
 */
const actualizarActivo = async (id, activo) => {
    const [result] = await db.execute(
        'UPDATE categorias SET activo = ?, fecha_modificacion = CURRENT_TIMESTAMP WHERE id = ?',
        [activo ? 1 : 0, id],
    );
    return result.affectedRows ?? 0;
};

/**
 * Borrado lógico (base ampliable a borrado físico).
 * @param {number} id
 * @returns {Promise<void>}
 */
const eliminarLogico = async (id) => {
    await db.execute(
        'UPDATE categorias SET activo = 0, fecha_modificacion = CURRENT_TIMESTAMP WHERE id = ?',
        [id],
    );
};

/**
 * Productos que referencian esta categoría (integridad referencial).
 * @param {number} categoria_id
 * @returns {Promise<number>}
 */
const contarProductosPorCategoria = async (categoria_id) => {
    const [rows] = await db.execute(
        'SELECT COUNT(*) AS total FROM productos WHERE categoria_id = ?',
        [categoria_id],
    );
    const n = rows[0]?.total;
    return typeof n === 'bigint' ? Number(n) : Number(n) || 0;
};

module.exports = {
    listarTodas,
    buscarPorId,
    buscarIdPorNombreNormalizado,
    crear,
    actualizar,
    actualizarActivo,
    eliminarLogico,
    contarProductosPorCategoria,
};
