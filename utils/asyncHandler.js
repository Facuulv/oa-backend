/**
 * Wraps an async route handler so rejected promises are forwarded to
 * Express's global error middleware instead of causing unhandled rejections.
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
