class AppError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
        if (details && typeof details === 'object') {
            this.errors = details;
        }
    }
}

const notFoundHandler = (req, res) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
        timestamp: new Date().toISOString(),
    });
};

/** Global error handler — must be the last middleware (fourth arg required by Express). */
const globalErrorHandler = (err, req, res, next) => {
    void next;
    console.error('[oa-api]', err);

    const statusCode = err.statusCode || err.status || 500;
    const isProduction = process.env.NODE_ENV === 'production';

    let clientMessage;
    if (err.isOperational && err.message) {
        clientMessage = err.message;
    } else if (isProduction && statusCode === 500) {
        clientMessage = 'Internal server error';
    } else {
        clientMessage = err.message;
    }

    const payload = {
        error: clientMessage,
        code: err.code || 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
    };

    if (err.errors && statusCode < 500) {
        payload.errors = err.errors;
    }

    res.status(statusCode).json(payload);
};

module.exports = { AppError, notFoundHandler, globalErrorHandler };
