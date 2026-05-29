/**
 * Horarios de atención de la carta online (fuente: horarios_tienda).
 * Soporta franjas que cruzan medianoche (ej. Viernes 20:00 → 02:30 del sábado).
 * Zona horaria: America/Argentina/Buenos_Aires
 */
const moment = require('moment-timezone');
const horariosTiendaRepository = require('../repositories/horariosTiendaRepository');
const tiendaOnlineSettingsService = require('./tiendaOnlineSettingsService');

const STORE_TIMEZONE = 'America/Argentina/Buenos_Aires';

/** Fallback si BD vacía o error */
const FALLBACK_SCHEDULE_RAW = {
    1: [[11, 0, 23, 0]],
    2: [[11, 0, 23, 0]],
    3: [[11, 0, 23, 0]],
    4: [[11, 0, 23, 0]],
    5: [[11, 0, 23, 0]],
    6: [[11, 0, 23, 0]],
};

const CACHE_TTL_MS = 30_000;
let scheduleCache = null;
let scheduleCacheAt = 0;
let testScheduleOverride = null;

const parseTimeToParts = (timeValue) => {
    const text = String(timeValue || '').trim();
    const match = text.match(/^(\d{1,2}):(\d{2})/);
    if (!match) return null;
    return [Number.parseInt(match[1], 10), Number.parseInt(match[2], 10)];
};

const slotToMinutes = ([sh, sm, eh, em]) => ({
    startM: sh * 60 + sm,
    endM: eh * 60 + em,
    isOvernight: eh * 60 + em < sh * 60 + sm,
});

const rowsToScheduleRaw = (rows) => {
    const schedule = {};
    for (const row of rows) {
        if (!row.activo) continue;
        const openParts = parseTimeToParts(row.hora_apertura);
        const closeParts = parseTimeToParts(row.hora_cierre);
        if (!openParts || !closeParts) continue;
        const day = String(row.dia_semana);
        if (!schedule[day]) schedule[day] = [];
        schedule[day].push([openParts[0], openParts[1], closeParts[0], closeParts[1]]);
    }
    return schedule;
};

const loadScheduleRaw = async () => {
    if (testScheduleOverride) {
        return { ...testScheduleOverride };
    }

    const now = Date.now();
    if (scheduleCache && now - scheduleCacheAt < CACHE_TTL_MS) {
        return { ...scheduleCache };
    }

    try {
        const rows = await horariosTiendaRepository.findAll();
        const fromDb = rowsToScheduleRaw(rows);
        const hasSlots = Object.keys(fromDb).length > 0;
        scheduleCache = hasSlots ? fromDb : { ...FALLBACK_SCHEDULE_RAW };
        scheduleCacheAt = now;
        return { ...scheduleCache };
    } catch (error) {
        console.error('[storeSchedule] Error cargando horarios_tienda, usando fallback:', error.message);
        return { ...FALLBACK_SCHEDULE_RAW };
    }
};

const getToleranceMinutes = async () => {
    const settings = await tiendaOnlineSettingsService.getSettings();
    const tolerance = Number(settings.toleranceMinutes);
    return Number.isFinite(tolerance) && tolerance >= 0 ? tolerance : 5;
};

const applyToleranceToEndMinutes = (endM, toleranceMinutes) => endM + toleranceMinutes;

/**
 * ¿Está abierto en esta franja?
 * @param {number} slotDay - dia_semana de la franja (0=Dom..6=Sáb)
 */
const isOpenInSlot = (currentDay, timeM, slotDay, slot, toleranceMinutes) => {
    const { startM, endM, isOvernight } = slotToMinutes(slot);
    const endWithTol = applyToleranceToEndMinutes(endM, toleranceMinutes);

    if (!isOvernight) {
        if (currentDay !== slotDay) return false;
        return timeM >= startM && timeM <= endWithTol;
    }

    const nextDay = (slotDay + 1) % 7;
    if (currentDay === slotDay && timeM >= startM) return true;
    if (currentDay === nextDay && timeM <= endWithTol) return true;
    return false;
};

const isWithinOpenSlotSync = (m, scheduleRaw, useTolerance, toleranceMinutes) => {
    const currentDay = m.day();
    const timeM = m.hour() * 60 + m.minute();
    const tol = useTolerance ? toleranceMinutes : 0;

    for (const [dayKey, slots] of Object.entries(scheduleRaw)) {
        const slotDay = Number(dayKey);
        if (!Array.isArray(slots)) continue;
        for (const slot of slots) {
            if (isOpenInSlot(currentDay, timeM, slotDay, slot, tol)) {
                return true;
            }
        }
    }
    return false;
};

function getNowInStoreTimezone() {
    return moment().tz(STORE_TIMEZONE);
}

const formatTime = (h, min) =>
    `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;

function getNextOpeningInfoSync(m, scheduleRaw, toleranceMinutes) {
    const candidates = [];

    for (let offset = 0; offset <= 7; offset += 1) {
        const dayStart = m.clone().startOf('day').add(offset, 'days');
        const checkDay = dayStart.day();
        const slots = scheduleRaw[checkDay];
        if (!slots?.length) continue;

        for (const slot of slots) {
            const [sh, sm, eh, em] = slot;
            const { isOvernight } = slotToMinutes(slot);
            const openAt = dayStart.clone().hour(sh).minute(sm).second(0).millisecond(0);
            if (!openAt.isAfter(m)) continue;

            let label = `${openAt.format('DD/MM')} ${formatTime(sh, sm)}`;
            if (isOvernight) {
                label += ` (cierra ${formatTime(eh, em)} del día siguiente)`;
            }

            candidates.push({ openAt: openAt.valueOf(), nextOpen: label });
        }
    }

    if (candidates.length === 0) return { nextOpen: null };
    candidates.sort((a, b) => a.openAt - b.openAt);
    return { nextOpen: candidates[0].nextOpen };
}

async function isStoreOpen(date) {
    const settings = await tiendaOnlineSettingsService.getSettings();
    if (!settings.validarHorarios) return true;

    const m = moment(date).tz(STORE_TIMEZONE);
    const scheduleRaw = await loadScheduleRaw();
    const toleranceMinutes = await getToleranceMinutes();
    return isWithinOpenSlotSync(m, scheduleRaw, true, toleranceMinutes);
}

async function getEstadoTienda(date = new Date()) {
    const settings = await tiendaOnlineSettingsService.getSettings();
    const toleranceMinutes = settings.toleranceMinutes ?? 5;
    const m = moment(date).tz(STORE_TIMEZONE);
    const scheduleRaw = await loadScheduleRaw();

    if (!settings.cartaOnlineHabilitada) {
        return {
            cartaOnlineHabilitada: false,
            validarHorarios: settings.validarHorarios,
            bloqueado: true,
            estaAbierto: false,
            mensaje: 'La carta online no está disponible en este momento.',
            nextOpeningText: null,
            timezone: STORE_TIMEZONE,
        };
    }

    if (!settings.validarHorarios) {
        return {
            cartaOnlineHabilitada: true,
            validarHorarios: false,
            bloqueado: false,
            estaAbierto: true,
            mensaje: 'Estamos abiertos',
            nextOpeningText: null,
            timezone: STORE_TIMEZONE,
        };
    }

    const abierto = isWithinOpenSlotSync(m, scheduleRaw, true, toleranceMinutes);

    if (abierto) {
        return {
            cartaOnlineHabilitada: true,
            validarHorarios: true,
            bloqueado: false,
            estaAbierto: true,
            mensaje: 'Estamos abiertos',
            nextOpeningText: null,
            timezone: STORE_TIMEZONE,
        };
    }

    const nextInfo = getNextOpeningInfoSync(m, scheduleRaw, toleranceMinutes);
    const nextOpeningText = nextInfo?.nextOpen ? `Próxima apertura: ${nextInfo.nextOpen}` : null;

    return {
        cartaOnlineHabilitada: true,
        validarHorarios: true,
        bloqueado: false,
        estaAbierto: false,
        mensaje: 'Estamos cerrados en este momento',
        nextOpeningText,
        timezone: STORE_TIMEZONE,
    };
}

const toPublicEstado = (estado) => ({
    estaAbierto: Boolean(estado.estaAbierto),
    bloqueado: Boolean(estado.bloqueado),
    validarHorarios: Boolean(estado.validarHorarios),
    mensaje: estado.mensaje || '',
    nextOpeningText: estado.nextOpeningText ?? null,
    timezone: estado.timezone || STORE_TIMEZONE,
});

const invalidateScheduleCache = () => {
    scheduleCache = null;
    scheduleCacheAt = 0;
};

const setTestScheduleOverride = (scheduleRaw) => {
    testScheduleOverride = scheduleRaw;
    invalidateScheduleCache();
};

const clearTestScheduleOverride = () => {
    testScheduleOverride = null;
    invalidateScheduleCache();
};

const applyToleranceToSlot = ([sh, sm, eh, em], toleranceMinutes) => {
    const { isOvernight } = slotToMinutes([sh, sm, eh, em]);
    if (isOvernight) {
        return [sh, sm, eh, em];
    }
    let endM = em + toleranceMinutes;
    let endH = eh;
    if (endM >= 60) {
        endM -= 60;
        endH += 1;
    }
    return [sh, sm, endH, endM];
};

const getStoreScheduleSync = (scheduleRaw, toleranceMinutes = 5) => {
    const schedule = {};
    for (const [day, slots] of Object.entries(scheduleRaw)) {
        schedule[day] = slots.map((slot) => applyToleranceToSlot(slot, toleranceMinutes));
    }
    return { timezone: STORE_TIMEZONE, toleranceMinutes, schedule };
};

const isStoreOpenSync = (date, scheduleRaw, toleranceMinutes = 5, validate = true) => {
    if (!validate) return true;
    const m = moment(date).tz(STORE_TIMEZONE);
    return isWithinOpenSlotSync(m, scheduleRaw, true, toleranceMinutes);
};

module.exports = {
    STORE_TIMEZONE,
    FALLBACK_SCHEDULE_RAW,
    getNowInStoreTimezone,
    isStoreOpen,
    getEstadoTienda,
    toPublicEstado,
    loadScheduleRaw,
    invalidateScheduleCache,
    setTestScheduleOverride,
    clearTestScheduleOverride,
    setTestSettingsOverride: tiendaOnlineSettingsService.setTestSettingsOverride,
    clearTestSettingsOverride: tiendaOnlineSettingsService.clearTestSettingsOverride,
    getStoreScheduleSync,
    isStoreOpenSync,
    isOpenInSlot,
    slotToMinutes,
};
