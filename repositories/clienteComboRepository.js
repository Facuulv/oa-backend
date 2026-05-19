const db = require('../config/database');

const TABLE = 'clientes_combos';

function normalizeName(name, fallbackLabel) {
    const candidate = String(name ?? '').trim();
    if (candidate) return candidate;
    const label = String(fallbackLabel ?? '').trim();
    return label || 'Mi Combo Custom';
}

async function ensureTable() {
    await db.execute(
        `CREATE TABLE IF NOT EXISTS ${TABLE} (
            id INT AUTO_INCREMENT PRIMARY KEY,
            cliente_id INT NOT NULL,
            nombre VARCHAR(80) NOT NULL,
            etiqueta VARCHAR(160) NULL,
            payload_json LONGTEXT NOT NULL,
            total DECIMAL(10,2) NULL,
            fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            fecha_modificacion TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT fk_clientes_combos_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
            KEY idx_clientes_combos_cliente_fecha (cliente_id, fecha_creacion)
        ) ENGINE=InnoDB`,
    );
}

async function listByCliente(clienteId) {
    const [rows] = await db.execute(
        `SELECT id, cliente_id, nombre, etiqueta, payload_json, total, fecha_creacion, fecha_modificacion
         FROM ${TABLE}
         WHERE cliente_id = ?
         ORDER BY fecha_creacion DESC`,
        [clienteId],
    );
    return rows;
}

async function insertCombo(clienteId, payload) {
    const nombre = normalizeName(payload.name, payload.label);
    const etiqueta = payload.label ? String(payload.label).trim().slice(0, 160) : null;
    const total = Number.isFinite(Number(payload.total)) ? Number(payload.total) : null;
    const serialized = JSON.stringify(payload);

    const [result] = await db.execute(
        `INSERT INTO ${TABLE} (cliente_id, nombre, etiqueta, payload_json, total)
         VALUES (?, ?, ?, ?, ?)`,
        [clienteId, nombre.slice(0, 80), etiqueta, serialized, total],
    );

    return result.insertId;
}

async function deleteByIdAndCliente(id, clienteId) {
    const [result] = await db.execute(`DELETE FROM ${TABLE} WHERE id = ? AND cliente_id = ?`, [id, clienteId]);
    return result.affectedRows > 0;
}

module.exports = {
    ensureTable,
    listByCliente,
    insertCombo,
    deleteByIdAndCliente,
};
