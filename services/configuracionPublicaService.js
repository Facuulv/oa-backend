const configuracionSistemaRepository = require('../repositories/configuracionSistemaRepository');
const tiendaOnlineSettingsService = require('./tiendaOnlineSettingsService');

const parseBoolean = (value, defaultValue = true) => {
    if (value === undefined || value === null) return defaultValue;
    const normalized = String(value).trim().toLowerCase();
    if (['1', 'true', 'si', 'sí', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off', ''].includes(normalized)) return false;
    return defaultValue;
};

const getPublicConfig = async () => {
    const map = await configuracionSistemaRepository.findByClaves([
        'WHATSAPP_PEDIDOS',
        'CARTA_ONLINE_HABILITADA',
    ]);

    const settings = await tiendaOnlineSettingsService.getSettings();
    const whatsappRaw = String(map.WHATSAPP_PEDIDOS || '').replace(/\D/g, '');

    return {
        whatsappPedidos: whatsappRaw || null,
        cartaHabilitada: settings.cartaOnlineHabilitada && parseBoolean(map.CARTA_ONLINE_HABILITADA, true),
    };
};

module.exports = {
    getPublicConfig,
};
