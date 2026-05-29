const db = require('../config/database');

/** Claves permitidas en lectura/escritura controlada. */
const ALLOWED_KEYS = Object.freeze([
    'CARTA_ONLINE_HABILITADA',
    'VALIDAR_HORARIOS_CHECKOUT',
    'WHATSAPP_PEDIDOS',
    'EMAIL_RECUPERACION_NOMBRE',
    'EMAIL_RECUPERACION_ASUNTO',
    'EMAIL_RECUPERACION_TEXTO_INTRO',
]);

const EMAIL_RECUPERACION_KEYS = Object.freeze([
    'EMAIL_RECUPERACION_NOMBRE',
    'EMAIL_RECUPERACION_ASUNTO',
    'EMAIL_RECUPERACION_TEXTO_INTRO',
]);

const ADMIN_SETTINGS_KEYS = Object.freeze([
    'CARTA_ONLINE_HABILITADA',
    'VALIDAR_HORARIOS_CHECKOUT',
    'WHATSAPP_PEDIDOS',
]);

const isAllowedKey = (clave) => ALLOWED_KEYS.includes(String(clave || '').trim());

const findByClaves = async (claves) => {
    const keys = claves.filter((k) => isAllowedKey(k));
    if (keys.length === 0) return {};

    const placeholders = keys.map(() => '?').join(',');
    const [rows] = await db.execute(
        `SELECT clave, valor FROM configuracion_sistema WHERE clave IN (${placeholders})`,
        keys,
    );

    return rows.reduce((acc, row) => {
        acc[row.clave] = row.valor;
        return acc;
    }, {});
};

const findAllAllowed = async () => findByClaves([...ALLOWED_KEYS]);

const findAdminSettings = async () => findByClaves([...ADMIN_SETTINGS_KEYS]);

const upsert = async (clave, valor) => {
    if (!isAllowedKey(clave)) {
        const err = new Error(`Clave de configuración no permitida: ${clave}`);
        err.code = 'CONFIG_KEY_NOT_ALLOWED';
        throw err;
    }

    await db.execute(
        `INSERT INTO configuracion_sistema (clave, valor) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE valor = VALUES(valor), fecha_modificacion = CURRENT_TIMESTAMP`,
        [clave, valor == null ? '' : String(valor)],
    );
};

const upsertMany = async (entries) => {
    for (const [clave, valor] of entries) {
        await upsert(clave, valor);
    }
};

module.exports = {
    ALLOWED_KEYS,
    EMAIL_RECUPERACION_KEYS,
    ADMIN_SETTINGS_KEYS,
    isAllowedKey,
    findByClaves,
    findAllAllowed,
    findAdminSettings,
    upsert,
    upsertMany,
};
