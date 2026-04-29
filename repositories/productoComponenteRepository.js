/**
 * Componentes de un producto tipo PROMOCION (`productos_componentes`).
 * @param {import('mysql2/promise').PoolConnection} [conn] conexión para transacción; si omite, usa el pool global.
 */
const db = require('../config/database');

const run = async (conn, sql, params) => {
    if (conn) {
        const [r] = await conn.execute(sql, params);
        return r;
    }
    const [r] = await db.execute(sql, params);
    return r;
};

/**
 * @param {import('mysql2/promise').PoolConnection|null} conn
 * @param {number} productoPadreId
 * @returns {Promise<void>}
 */
const eliminarPorPadre = async (conn, productoPadreId) => {
    await run(conn, 'DELETE FROM productos_componentes WHERE producto_padre_id = ?', [productoPadreId]);
};

/**
 * @param {import('mysql2/promise').PoolConnection|null} conn
 * @param {number} productoPadreId
 * @param {Array<{ producto_hijo_id: number, cantidad: number }>} filas
 */
const insertarVarios = async (conn, productoPadreId, filas) => {
    for (const { producto_hijo_id, cantidad } of filas) {
        await run(
            conn,
            `INSERT INTO productos_componentes (producto_padre_id, producto_hijo_id, cantidad)
             VALUES (?, ?, ?)`,
            [productoPadreId, producto_hijo_id, cantidad],
        );
    }
};

/**
 * Detalle de componentes con datos del hijo para armar respuestas admin.
 * @param {import('mysql2/promise').PoolConnection|null} conn
 * @param {number} productoPadreId
 * @returns {Promise<Array<object>>}
 */
const listarDetallePorPadre = async (conn, productoPadreId) => {
    const sql = `SELECT pc.id,
                        pc.producto_hijo_id,
                        pc.cantidad,
                        h.nombre AS nombre_hijo,
                        h.stock AS stock_hijo,
                        h.precio AS precio_hijo
                 FROM productos_componentes pc
                 INNER JOIN productos h ON h.id = pc.producto_hijo_id
                 WHERE pc.producto_padre_id = ?
                 ORDER BY pc.id ASC`;
    if (conn) {
        const [rows] = await conn.execute(sql, [productoPadreId]);
        return rows;
    }
    const [rows] = await db.execute(sql, [productoPadreId]);
    return rows;
};

/**
 * Filas mínimas para disponibilidad / descuento por lote (varios padres).
 * @param {import('mysql2/promise').PoolConnection|null} conn
 * @param {number[]} productoPadreIds
 * @returns {Promise<Array<{ producto_padre_id: number, producto_hijo_id: number, cantidad: number, stock_hijo: number }>>}
 */
/**
 * Suma (cantidad × precio unitario del hijo) por cada combo/padre, para listados admin.
 * @param {import('mysql2/promise').PoolConnection|null} conn
 * @param {number[]} productoPadreIds
 * @returns {Promise<Map<number, number>>} padre_id → total precio componentes
 */
const totalesPrecioPorPadres = async (conn, productoPadreIds) => {
    const ids = [...new Set((productoPadreIds || []).map((id) => Math.trunc(Number(id))).filter((n) => n > 0))];
    const map = new Map();
    if (ids.length === 0) {
        return map;
    }
    const placeholders = ids.map(() => '?').join(',');
    const sql = `SELECT pc.producto_padre_id AS producto_padre_id,
                        SUM(pc.cantidad * h.precio) AS total_componentes
                 FROM productos_componentes pc
                 INNER JOIN productos h ON h.id = pc.producto_hijo_id
                 WHERE pc.producto_padre_id IN (${placeholders})
                 GROUP BY pc.producto_padre_id`;
    let rows;
    if (conn) {
        const [r] = await conn.execute(sql, ids);
        rows = r;
    } else {
        const [r] = await db.execute(sql, ids);
        rows = r;
    }
    for (const row of rows) {
        const pid = Math.trunc(Number(row.producto_padre_id));
        const raw = row.total_componentes;
        const n = typeof raw === 'bigint' ? Number(raw) : Number(raw);
        map.set(pid, Number.isFinite(n) ? n : 0);
    }
    return map;
};

const listarFilasStockPorPadres = async (conn, productoPadreIds) => {
    const ids = [...new Set((productoPadreIds || []).map((id) => Math.trunc(Number(id))).filter((n) => n > 0))];
    if (ids.length === 0) {
        return [];
    }
    const placeholders = ids.map(() => '?').join(',');
    const sql = `SELECT pc.producto_padre_id,
                        pc.producto_hijo_id,
                        pc.cantidad,
                        h.stock AS stock_hijo
                 FROM productos_componentes pc
                 INNER JOIN productos h ON h.id = pc.producto_hijo_id
                 WHERE pc.producto_padre_id IN (${placeholders})
                 ORDER BY pc.producto_padre_id ASC, pc.id ASC`;
    if (conn) {
        const [rows] = await conn.execute(sql, ids);
        return rows;
    }
    const [rows] = await db.execute(sql, ids);
    return rows;
};

module.exports = {
    eliminarPorPadre,
    insertarVarios,
    listarDetallePorPadre,
    listarFilasStockPorPadres,
    totalesPrecioPorPadres,
};
