const configuracionSistemaRepository = require('../repositories/configuracionSistemaRepository');

const KEYS = Object.freeze({
    CARTA_ONLINE_HABILITADA: 'CARTA_ONLINE_HABILITADA',
    VALIDAR_HORARIOS_CHECKOUT: 'VALIDAR_HORARIOS_CHECKOUT',
});

const CACHE_TTL_MS = 30_000;
let settingsCache = null;
let settingsCacheAt = 0;
let testSettingsOverride = null;

const TOLERANCE_MINUTES_DEFAULT = 5;

const parseBoolean = (value, defaultValue = true) => {
    if (value === undefined || value === null) return defaultValue;
    if (typeof value === 'boolean') return value;
    const normalized = String(value).trim().toLowerCase();
    if (['1', 'true', 'si', 'sí', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off', ''].includes(normalized)) return false;
    return defaultValue;
};

const fetchSettingsFromDb = async () => {
    const map = await configuracionSistemaRepository.findByClaves([
        KEYS.CARTA_ONLINE_HABILITADA,
        KEYS.VALIDAR_HORARIOS_CHECKOUT,
    ]);

    return {
        cartaOnlineHabilitada: parseBoolean(map[KEYS.CARTA_ONLINE_HABILITADA], true),
        validarHorarios: parseBoolean(map[KEYS.VALIDAR_HORARIOS_CHECKOUT], true),
        toleranceMinutes: TOLERANCE_MINUTES_DEFAULT,
    };
};

const getSettings = async () => {
    if (testSettingsOverride) {
        return { ...testSettingsOverride };
    }

    const now = Date.now();
    if (settingsCache && now - settingsCacheAt < CACHE_TTL_MS) {
        return { ...settingsCache };
    }

    try {
        const settings = await fetchSettingsFromDb();
        settingsCache = settings;
        settingsCacheAt = now;
        return { ...settings };
    } catch (error) {
        console.error('[tiendaOnlineSettings] Error leyendo BD, usando defaults:', error.message);
        return {
            cartaOnlineHabilitada: true,
            validarHorarios: true,
            toleranceMinutes: TOLERANCE_MINUTES_DEFAULT,
        };
    }
};

const updateCartaSettings = async ({ cartaOnlineHabilitada, validarHorarios }) => {
    const entries = [];

    if (cartaOnlineHabilitada !== undefined) {
        entries.push([
            KEYS.CARTA_ONLINE_HABILITADA,
            cartaOnlineHabilitada ? 'true' : 'false',
        ]);
    }
    if (validarHorarios !== undefined) {
        entries.push([
            KEYS.VALIDAR_HORARIOS_CHECKOUT,
            validarHorarios ? 'true' : 'false',
        ]);
    }

    if (entries.length > 0) {
        await configuracionSistemaRepository.upsertMany(entries);
    }

    invalidateCache();
    return getSettings();
};

const invalidateCache = () => {
    settingsCache = null;
    settingsCacheAt = 0;
};

const setTestSettingsOverride = (settings) => {
    testSettingsOverride = settings;
    invalidateCache();
};

const clearTestSettingsOverride = () => {
    testSettingsOverride = null;
    invalidateCache();
};

module.exports = {
    KEYS,
    getSettings,
    updateCartaSettings,
    invalidateCache,
    setTestSettingsOverride,
    clearTestSettingsOverride,
};
