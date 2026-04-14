const db = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');

exports.check = asyncHandler(async (_req, res) => {
    const start = Date.now();
    await db.execute('SELECT 1');
    const dbMs = Date.now() - start;

    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        server: {
            uptime: Math.floor(process.uptime()),
            memory: process.memoryUsage(),
            nodeVersion: process.version,
        },
        database: {
            status: 'connected',
            responseTime: `${dbMs}ms`,
        },
    });
});
