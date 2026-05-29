const moment = require('moment-timezone');
const {
    getStoreScheduleSync,
    getNowInStoreTimezone,
    isStoreOpenSync,
    getEstadoTienda,
    FALLBACK_SCHEDULE_RAW,
    STORE_TIMEZONE,
    setTestScheduleOverride,
    clearTestScheduleOverride,
    setTestSettingsOverride,
    clearTestSettingsOverride,
    toPublicEstado,
} = require('../services/storeScheduleService');

const SCHEDULE = FALLBACK_SCHEDULE_RAW;

const parseInTz = (str) => moment.tz(str, 'YYYY-MM-DD HH:mm', STORE_TIMEZONE);

describe('storeScheduleService', () => {
    beforeEach(() => {
        setTestScheduleOverride(SCHEDULE);
        setTestSettingsOverride({
            cartaOnlineHabilitada: true,
            validarHorarios: true,
            toleranceMinutes: 5,
        });
    });

    afterEach(() => {
        clearTestScheduleOverride();
        clearTestSettingsOverride();
    });

    test('getStoreScheduleSync devuelve timezone y schedule con tolerancia', () => {
        const s = getStoreScheduleSync(SCHEDULE, 5);
        expect(s.timezone).toBe(STORE_TIMEZONE);
        expect(s.schedule['3']).toEqual([
            [11, 0, 23, 5],
        ]);
    });

    test('getNowInStoreTimezone devuelve moment válido', () => {
        expect(getNowInStoreTimezone().isValid()).toBe(true);
    });

    test('miércoles 12:00 => abierto', () => {
        const d = parseInTz('2026-03-04 12:00').toDate();
        expect(isStoreOpenSync(d, SCHEDULE, 5, true)).toBe(true);
    });

    test('miércoles 23:30 => cerrado (fuera de franja con tolerancia)', () => {
        const d = parseInTz('2026-03-04 23:30').toDate();
        expect(isStoreOpenSync(d, SCHEDULE, 5, true)).toBe(false);
    });

    test('domingo sin franjas => cerrado', () => {
        const d = parseInTz('2026-03-01 12:00').toDate();
        expect(isStoreOpenSync(d, SCHEDULE, 5, true)).toBe(false);
    });

    test('getEstadoTienda: carta deshabilitada => bloqueado', async () => {
        setTestSettingsOverride({
            cartaOnlineHabilitada: false,
            validarHorarios: true,
            toleranceMinutes: 5,
        });
        const estado = await getEstadoTienda(parseInTz('2026-03-04 12:00').toDate());
        expect(estado.bloqueado).toBe(true);
        expect(estado.estaAbierto).toBe(false);
    });

    test('getEstadoTienda: validación OFF => siempre abierto', async () => {
        setTestSettingsOverride({
            cartaOnlineHabilitada: true,
            validarHorarios: false,
            toleranceMinutes: 5,
        });
        const estado = await getEstadoTienda(parseInTz('2026-03-01 12:00').toDate());
        expect(estado.estaAbierto).toBe(true);
        expect(estado.validarHorarios).toBe(false);
    });

    test('toPublicEstado expone solo campos públicos', async () => {
        const estado = await getEstadoTienda(parseInTz('2026-03-04 12:00').toDate());
        const pub = toPublicEstado(estado);
        expect(pub).toEqual({
            estaAbierto: true,
            bloqueado: false,
            validarHorarios: true,
            mensaje: 'Estamos abiertos',
            nextOpeningText: null,
            timezone: STORE_TIMEZONE,
        });
        expect(pub.cartaOnlineHabilitada).toBeUndefined();
    });
});

describe('storeScheduleService — horarios nocturnos', () => {
    /** Viernes 20:00 → 02:30 (sábado) */
    const FRIDAY_OVERNIGHT = { 5: [[20, 0, 2, 30]] };

    beforeEach(() => {
        setTestScheduleOverride(FRIDAY_OVERNIGHT);
        setTestSettingsOverride({
            cartaOnlineHabilitada: true,
            validarHorarios: true,
            toleranceMinutes: 5,
        });
    });

    afterEach(() => {
        clearTestScheduleOverride();
        clearTestSettingsOverride();
    });

    test('viernes 21:00 con franja 20:00→02:30 => abierto', () => {
        const d = parseInTz('2026-03-06 21:00').toDate();
        expect(isStoreOpenSync(d, FRIDAY_OVERNIGHT, 5, true)).toBe(true);
    });

    test('sábado 01:30 (cola del viernes) => abierto', () => {
        const d = parseInTz('2026-03-07 01:30').toDate();
        expect(isStoreOpenSync(d, FRIDAY_OVERNIGHT, 5, true)).toBe(true);
    });

    test('sábado 03:00 => cerrado', () => {
        const d = parseInTz('2026-03-07 03:00').toDate();
        expect(isStoreOpenSync(d, FRIDAY_OVERNIGHT, 5, true)).toBe(false);
    });

    test('viernes 19:00 => cerrado', () => {
        const d = parseInTz('2026-03-06 19:00').toDate();
        expect(isStoreOpenSync(d, FRIDAY_OVERNIGHT, 5, true)).toBe(false);
    });

    test('getEstadoTienda sábado 01:30 => abierto', async () => {
        const estado = await getEstadoTienda(parseInTz('2026-03-07 01:30').toDate());
        expect(estado.estaAbierto).toBe(true);
    });

    test('getEstadoTienda viernes 19:00 => cerrado con próxima apertura', async () => {
        const estado = await getEstadoTienda(parseInTz('2026-03-06 19:00').toDate());
        expect(estado.estaAbierto).toBe(false);
        expect(estado.nextOpeningText).toMatch(/20:00/);
    });
});
