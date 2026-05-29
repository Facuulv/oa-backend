const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middlewares/errorHandler');
const horariosTiendaRepository = require('../repositories/horariosTiendaRepository');
const configuracionSistemaRepository = require('../repositories/configuracionSistemaRepository');
const tiendaOnlineSettingsService = require('../services/tiendaOnlineSettingsService');
const storeScheduleService = require('../services/storeScheduleService');
const emailConfigService = require('../services/emailConfigService');
const { normalizeWhatsappPedidos } = require('../utils/whatsappPedidos');

const TIME_REGEX = /^([01]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

const normalizeTime = (value) => {
    const text = String(value || '').trim();
    if (!TIME_REGEX.test(text)) return null;
    const parts = text.split(':');
    if (parts.length === 2) return `${parts[0].padStart(2, '0')}:${parts[1]}:00`;
    return `${parts[0].padStart(2, '0')}:${parts[1]}:${parts[2]}`;
};

const validateFranjas = (franjas) => {
    if (!Array.isArray(franjas)) return 'franjas debe ser un array';

    for (const franja of franjas) {
        if (!franja || typeof franja !== 'object') return 'Cada franja debe ser un objeto válido';
        if (!franja.activo) continue;

        const apertura = normalizeTime(franja.hora_apertura);
        const cierre = normalizeTime(franja.hora_cierre);
        if (!apertura || !cierre) {
            return 'hora_apertura y hora_cierre deben tener formato HH:mm';
        }
        if (apertura === cierre) {
            return 'hora_apertura y hora_cierre no pueden ser iguales';
        }
        franja.hora_apertura = apertura;
        franja.hora_cierre = cierre;
    }

    return null;
};

const mapSettingsForAdmin = (settingsMap, runtimeSettings) => ({
    CARTA_ONLINE_HABILITADA:
        settingsMap.CARTA_ONLINE_HABILITADA ??
        (runtimeSettings.cartaOnlineHabilitada ? 'true' : 'false'),
    VALIDAR_HORARIOS_CHECKOUT:
        settingsMap.VALIDAR_HORARIOS_CHECKOUT ??
        (runtimeSettings.validarHorarios ? 'true' : 'false'),
    WHATSAPP_PEDIDOS: settingsMap.WHATSAPP_PEDIDOS ?? '',
});

exports.getConfiguracion = asyncHandler(async (_req, res) => {
    const [settingsMap, horarios, runtimeSettings, emailRecuperacion] = await Promise.all([
        configuracionSistemaRepository.findAdminSettings(),
        horariosTiendaRepository.findAll(),
        tiendaOnlineSettingsService.getSettings(),
        emailConfigService.getAdminConfig(),
    ]);

    const estadoFull = await storeScheduleService.getEstadoTienda();

    res.json({
        data: {
            settings: mapSettingsForAdmin(settingsMap, runtimeSettings),
            horarios,
            estado: storeScheduleService.toPublicEstado(estadoFull),
            emailRecuperacion,
        },
    });
});

exports.getEmailRecuperacion = asyncHandler(async (_req, res) => {
    const data = await emailConfigService.getAdminConfig();
    res.json({ data });
});

exports.updateEmailRecuperacion = asyncHandler(async (req, res) => {
    const { nombre, asunto, textoIntro } = req.validatedData;
    const data = await emailConfigService.updateEmailConfig({ nombre, asunto, textoIntro });
    res.json({
        data,
        message: 'Configuración de email de recuperación actualizada',
    });
});

exports.updateCarta = asyncHandler(async (req, res) => {
    const { cartaOnlineHabilitada, validarHorarios } = req.validatedData;

    const settings = await tiendaOnlineSettingsService.updateCartaSettings({
        cartaOnlineHabilitada,
        validarHorarios,
    });

    storeScheduleService.invalidateScheduleCache();

    res.json({
        data: {
            CARTA_ONLINE_HABILITADA: settings.cartaOnlineHabilitada ? 'true' : 'false',
            VALIDAR_HORARIOS_CHECKOUT: settings.validarHorarios ? 'true' : 'false',
        },
        message: 'Configuración de carta actualizada',
    });
});

exports.updateHorarioDia = asyncHandler(async (req, res) => {
    const { dia_semana: diaSemana, franjas } = req.validatedData;

    const franjasError = validateFranjas(franjas);
    if (franjasError) {
        throw new AppError(franjasError, 400, 'VALIDATION_ERROR');
    }

    await horariosTiendaRepository.replaceDay(diaSemana, franjas);
    storeScheduleService.invalidateScheduleCache();

    const horarios = await horariosTiendaRepository.findAll();
    const estado = await storeScheduleService.getEstadoTienda();

    res.json({
        data: {
            horarios,
            estado: storeScheduleService.toPublicEstado(estado),
        },
        message: 'Horarios actualizados',
    });
});

exports.updateWhatsapp = asyncHandler(async (req, res) => {
    const normalized = normalizeWhatsappPedidos(req.validatedData.numero);
    if (!normalized.ok) {
        throw new AppError(normalized.error, 400, 'WHATSAPP_INVALID');
    }

    await configuracionSistemaRepository.upsert('WHATSAPP_PEDIDOS', normalized.value);

    res.json({
        data: { WHATSAPP_PEDIDOS: normalized.value },
        message: 'WhatsApp de pedidos actualizado',
    });
});
