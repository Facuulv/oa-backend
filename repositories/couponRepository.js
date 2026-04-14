const db = require('../config/database');

/**
 * Cupón activo con promoción (tablas `cupones` / `promociones`).
 * @returns {Promise<object|null>}
 */
const findActiveWithPromotionByCode = async (code, { connection } = {}) => {
    const exec = connection ? connection.execute.bind(connection) : db.execute.bind(db);
    const [rows] = await exec(
        `SELECT c.id, c.codigo, c.promocion_id, c.usos_maximos, c.usos_actuales, c.vence_en, c.activo,
                p.nombre AS promotion_name, p.tipo AS promotion_type, p.valor AS promotion_value,
                p.monto_minimo AS min_purchase, p.activa AS promotion_active
         FROM cupones c
         JOIN promociones p ON c.promocion_id = p.id
         WHERE c.codigo = ? AND c.activo = 1 AND p.activa = 1
         LIMIT 1`,
        [code],
    );
    return rows[0] || null;
};

module.exports = {
    findActiveWithPromotionByCode,
};
