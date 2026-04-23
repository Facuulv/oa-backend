module.exports = {
    ROLES: {
        ADMIN: 'ADMIN',
        CLIENTE: 'CLIENTE',
    },

    /** Discriminador en el JWT para no mezclar sesión interna (`usuarios`) con clientes de tienda (`clientes`). */
    JWT_TOKEN_USE: {
        INTERNAL_USER: 'internal_user',
        STORE_CLIENT: 'store_client',
    },

    ORDER_STATUS: {
        PENDING: 'PENDING',
        CONFIRMED: 'CONFIRMED',
        SHIPPED: 'SHIPPED',
        DELIVERED: 'DELIVERED',
        CANCELLED: 'CANCELLED',
    },

    PROMOTION_TYPES: {
        PERCENTAGE: 'PERCENTAGE',
        FIXED: 'FIXED',
        BUY_X_GET_Y: 'BUY_X_GET_Y',
    },

    /** Default sales tax rate (e.g. 0.21 = 21%). Override via settings when implemented. */
    DEFAULT_TAX_RATE: 0.21,

    TOKEN_EXPIRATION: {
        access: process.env.NODE_ENV === 'development' ? '2h' : '1h',
    },

    /** Duración del access JWT y de la cookie de sesión admin (ms). Debe alinearse con TOKEN_EXPIRATION.access. */
    ACCESS_TOKEN_MAX_AGE_MS:
        process.env.NODE_ENV === 'development' ? 2 * 60 * 60 * 1000 : 60 * 60 * 1000,

    PAGINATION: {
        DEFAULT_PAGE: 1,
        DEFAULT_LIMIT: 20,
        MAX_LIMIT: 100,
    },
};
