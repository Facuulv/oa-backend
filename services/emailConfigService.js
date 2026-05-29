const configuracionSistemaRepository = require('../repositories/configuracionSistemaRepository');

const KEYS = Object.freeze({
    NOMBRE: 'EMAIL_RECUPERACION_NOMBRE',
    ASUNTO: 'EMAIL_RECUPERACION_ASUNTO',
    TEXTO_INTRO: 'EMAIL_RECUPERACION_TEXTO_INTRO',
});

const DEFAULTS = Object.freeze({
    nombre: 'OA!',
    asunto: 'OA! - Recuperación de contraseña',
    textoIntro:
        'Recibimos una solicitud para restablecer tu contraseña. Usá el enlace de abajo para continuar.',
});

const CACHE_TTL_MS = 30_000;
let cache = null;
let cacheAt = 0;

const stripHtmlTags = (value) =>
    String(value ?? '')
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();

const sanitizePlain = (value, maxLen) => {
    const cleaned = stripHtmlTags(value);
    if (!cleaned) return '';
    return cleaned.length > maxLen ? cleaned.slice(0, maxLen) : cleaned;
};

const getSmtpFromEnv = () => String(process.env.SMTP_FROM || '').trim();

/**
 * Encabezado From seguro: solo el nombre visible es configurable; el email es SMTP_FROM.
 */
const buildFromHeader = (nombreVisible) => {
    const smtpFrom = getSmtpFromEnv();
    if (!smtpFrom) return null;

    const name = sanitizePlain(nombreVisible, 100) || DEFAULTS.nombre;
    const safeName = name.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `"${safeName}" <${smtpFrom}>`;
};

const mapRowValues = (map) => ({
    nombre: sanitizePlain(map[KEYS.NOMBRE], 100) || DEFAULTS.nombre,
    asunto: sanitizePlain(map[KEYS.ASUNTO], 200) || DEFAULTS.asunto,
    textoIntro: sanitizePlain(map[KEYS.TEXTO_INTRO], 2000) || DEFAULTS.textoIntro,
});

const fetchFromDb = async () => {
    const map = await configuracionSistemaRepository.findByClaves([
        KEYS.NOMBRE,
        KEYS.ASUNTO,
        KEYS.TEXTO_INTRO,
    ]);
    return mapRowValues(map);
};

const getEmailConfig = async () => {
    const now = Date.now();
    if (cache && now - cacheAt < CACHE_TTL_MS) {
        return { ...cache };
    }

    const values = await fetchFromDb();
    const smtpFrom = getSmtpFromEnv();

    cache = {
        ...values,
        smtpFrom,
        fromHeader: buildFromHeader(values.nombre),
    };
    cacheAt = now;
    return { ...cache };
};

const getAdminConfig = async () => {
    const cfg = await getEmailConfig();
    return {
        nombre: cfg.nombre,
        asunto: cfg.asunto,
        textoIntro: cfg.textoIntro,
        smtpFromActual: cfg.smtpFrom || null,
    };
};

const updateEmailConfig = async ({ nombre, asunto, textoIntro }) => {
    const entries = [
        [KEYS.NOMBRE, sanitizePlain(nombre, 100) || DEFAULTS.nombre],
        [KEYS.ASUNTO, sanitizePlain(asunto, 200) || DEFAULTS.asunto],
        [
            KEYS.TEXTO_INTRO,
            textoIntro === undefined || textoIntro === null
                ? DEFAULTS.textoIntro
                : sanitizePlain(textoIntro, 2000),
        ],
    ];

    await configuracionSistemaRepository.upsertMany(entries);
    invalidateCache();
    return getAdminConfig();
};

const invalidateCache = () => {
    cache = null;
    cacheAt = 0;
};

const escapeHtml = (text) =>
    String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

const buildResetEmailContent = async ({ nombre, resetUrl }) => {
    const cfg = await getEmailConfig();
    const firstName = sanitizePlain(nombre, 100) || 'cliente';
    const intro = cfg.textoIntro || DEFAULTS.textoIntro;

    const text = [
        `Hola ${firstName},`,
        '',
        intro,
        '',
        `Usá este enlace para continuar:`,
        resetUrl,
        '',
        'El enlace vence en 1 hora. Si no solicitaste este cambio, podés ignorar este mensaje.',
    ].join('\n');

    const html = `
            <p>Hola ${escapeHtml(firstName)},</p>
            <p>${escapeHtml(intro)}</p>
            <p><a href="${escapeHtml(resetUrl)}">Restablecer contraseña</a></p>
            <p>Este enlace vence en 1 hora. Si no solicitaste este cambio, podés ignorar este mensaje.</p>
        `;

    return {
        subject: cfg.asunto || DEFAULTS.asunto,
        from: cfg.fromHeader || cfg.smtpFrom,
        text,
        html,
    };
};

module.exports = {
    KEYS,
    DEFAULTS,
    stripHtmlTags,
    sanitizePlain,
    buildFromHeader,
    getEmailConfig,
    getAdminConfig,
    updateEmailConfig,
    buildResetEmailContent,
    invalidateCache,
};
