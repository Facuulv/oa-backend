const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middlewares/errorHandler');

/** Reservado para futura integración de pagos (no implementado). */
exports.createPreference = asyncHandler(async (_req, res) => {
    throw new AppError('Checkout not implemented yet', 501, 'NOT_IMPLEMENTED');
});

/** Stub de webhook: responde 200 para no bloquear pruebas. */
exports.webhook = asyncHandler(async (req, res) => {
    if (process.env.NODE_ENV === 'development') {
        console.log('[oa-api] checkout webhook (stub):', req.body?.type || req.body);
    }
    res.sendStatus(200);
});
