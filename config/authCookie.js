const { ACCESS_TOKEN_MAX_AGE_MS } = require('./constants');

const adminSessionCookieName = () =>
    process.env.ADMIN_SESSION_COOKIE_NAME || 'oa_admin_token';

const parseSameSite = () => {
    const raw = (process.env.ADMIN_SESSION_COOKIE_SAMESITE || 'lax').toLowerCase();
    if (raw === 'strict' || raw === 'lax' || raw === 'none') return raw;
    return 'lax';
};

const adminSessionCookieBase = () => {
    const isProd = process.env.NODE_ENV === 'production';
    const forceSecure = process.env.COOKIE_SECURE === 'true';
    const sameSite = parseSameSite();
    const domain = process.env.ADMIN_SESSION_COOKIE_DOMAIN?.trim() || undefined;
    const secure = isProd || forceSecure || sameSite === 'none';

    return {
        httpOnly: true,
        secure,
        sameSite,
        path: process.env.ADMIN_SESSION_COOKIE_PATH?.trim() || '/',
        ...(domain ? { domain } : {}),
    };
};

const adminSessionCookieOptions = () => ({
    ...adminSessionCookieBase(),
    maxAge: ACCESS_TOKEN_MAX_AGE_MS,
});

/** Opciones mínimas para `clearCookie` (deben coincidir con path/domain/secure/sameSite del set). */
const adminSessionClearCookieOptions = () => adminSessionCookieBase();

const clearAdminSessionCookie = (res) => {
    res.clearCookie(adminSessionCookieName(), adminSessionClearCookieOptions());
};

const clientSessionCookieName = () =>
    process.env.CLIENT_SESSION_COOKIE_NAME || 'oa_client_token';

const clientSessionCookieBase = () => {
    const isProd = process.env.NODE_ENV === 'production';
    const forceSecure = process.env.COOKIE_SECURE === 'true';
    const raw = (process.env.CLIENT_SESSION_COOKIE_SAMESITE || 'lax').toLowerCase();
    const sameSite = raw === 'strict' || raw === 'lax' || raw === 'none' ? raw : 'lax';
    const domain = process.env.CLIENT_SESSION_COOKIE_DOMAIN?.trim() || undefined;
    const secure = isProd || forceSecure || sameSite === 'none';

    return {
        httpOnly: true,
        secure,
        sameSite,
        path: process.env.CLIENT_SESSION_COOKIE_PATH?.trim() || '/',
        ...(domain ? { domain } : {}),
    };
};

const clientSessionCookieOptions = () => ({
    ...clientSessionCookieBase(),
    maxAge: ACCESS_TOKEN_MAX_AGE_MS,
});

const clientSessionClearCookieOptions = () => clientSessionCookieBase();

const clearClientSessionCookie = (res) => {
    res.clearCookie(clientSessionCookieName(), clientSessionClearCookieOptions());
};

/** Logout global: evita sesiones cruzadas si quedaron ambas cookies. */
const clearAllSessionCookies = (res) => {
    clearAdminSessionCookie(res);
    clearClientSessionCookie(res);
};

module.exports = {
    adminSessionCookieName,
    adminSessionCookieOptions,
    adminSessionClearCookieOptions,
    clearAdminSessionCookie,
    clientSessionCookieName,
    clientSessionCookieOptions,
    clientSessionClearCookieOptions,
    clearClientSessionCookie,
    clearAllSessionCookies,
};
