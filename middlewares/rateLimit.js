const requestCounts = new Map();

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

const parseEnvNumber = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const configs = {
    login: {
        windowMs: parseEnvNumber(process.env.RATE_LIMIT_LOGIN_WINDOW_MS, 15 * 60 * 1000),
        maxRequests: parseEnvNumber(process.env.RATE_LIMIT_LOGIN_MAX, 5),
        message: 'Too many login attempts. Try again in 15 minutes.',
    },
    api: {
        windowMs: parseEnvNumber(process.env.RATE_LIMIT_API_WINDOW_MS, 60 * 1000),
        maxRequests: parseEnvNumber(process.env.RATE_LIMIT_API_MAX, isProduction ? 100 : 1000),
        message: 'Too many requests. Try again in a minute.',
    },
    strict: {
        windowMs: parseEnvNumber(process.env.RATE_LIMIT_STRICT_WINDOW_MS, 60 * 1000),
        maxRequests: parseEnvNumber(process.env.RATE_LIMIT_STRICT_MAX, 10),
        message: 'Rate limit exceeded. Try again in a minute.',
    },
};

const localhostDevMax = parseEnvNumber(process.env.RATE_LIMIT_DEV_LOCALHOST_MAX, 10000);

function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
        return forwarded.split(',')[0].trim();
    }
    const raw = req.ip || req.connection?.remoteAddress || '';
    return raw.startsWith('::ffff:') ? raw.slice(7) : raw || 'unknown';
}

function isLocalIp(ip) {
    return ip === '127.0.0.1' || ip === '::1' || ip === 'localhost';
}

function setHeaders(res, max, remaining, resetTime, includeRetry = false) {
    const resetSec = Math.max(0, Math.ceil((resetTime - Date.now()) / 1000));
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, remaining)));
    res.setHeader('X-RateLimit-Reset', String(resetSec));
    if (includeRetry) res.setHeader('Retry-After', String(resetSec));
}

const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, data] of requestCounts.entries()) {
        if (now > data.resetTime) requestCounts.delete(key);
    }
}, 5 * 60 * 1000);
if (typeof cleanupInterval.unref === 'function') cleanupInterval.unref();

const rateLimiter = (type = 'api') => (req, res, next) => {
    const config = { ...(configs[type] || configs.api) };
    const clientIp = getClientIp(req);

    if (isDevelopment && isLocalIp(clientIp)) {
        config.maxRequests = Math.max(config.maxRequests, localhostDevMax);
    }

    const identifier = req.user?.id ? `user_${req.user.id}` : `ip_${clientIp}`;
    const key = `${type}_${identifier}`;
    const now = Date.now();

    let record = requestCounts.get(key);

    if (!record || now > record.resetTime) {
        record = { count: 1, resetTime: now + config.windowMs };
        requestCounts.set(key, record);
        setHeaders(res, config.maxRequests, config.maxRequests - 1, record.resetTime);
        return next();
    }

    record.count++;
    setHeaders(res, config.maxRequests, config.maxRequests - record.count, record.resetTime);

    if (record.count > config.maxRequests) {
        setHeaders(res, config.maxRequests, 0, record.resetTime, true);
        return res.status(429).json({
            code: 'RATE_LIMIT_EXCEEDED',
            error: config.message,
            retryAfter: Math.max(0, Math.ceil((record.resetTime - now) / 1000)),
        });
    }

    next();
};

module.exports = {
    rateLimiter,
    loginRateLimiter: rateLimiter('login'),
    apiRateLimiter: rateLimiter('api'),
    strictRateLimiter: rateLimiter('strict'),
};
