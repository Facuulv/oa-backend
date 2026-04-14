module.exports = {
    ROLES: {
        ADMIN: 'ADMIN',
        CLIENTE: 'CLIENTE',
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

    PAGINATION: {
        DEFAULT_PAGE: 1,
        DEFAULT_LIMIT: 20,
        MAX_LIMIT: 100,
    },
};
