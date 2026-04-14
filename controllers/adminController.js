const db = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');

exports.dashboard = asyncHandler(async (_req, res) => {
    const [ordersToday] = await db.execute(
        'SELECT COUNT(*) AS count FROM pedidos WHERE DATE(fecha_creacion) = CURDATE()',
    );

    const [revenueToday] = await db.execute(
        "SELECT COALESCE(SUM(total), 0) AS revenue FROM pedidos WHERE DATE(fecha_creacion) = CURDATE() AND estado != 'CANCELLED'",
    );

    const [pendingOrders] = await db.execute(
        "SELECT COUNT(*) AS count FROM pedidos WHERE estado = 'PENDING'",
    );

    const [totalProducts] = await db.execute('SELECT COUNT(*) AS count FROM productos WHERE activo = 1');

    const [totalCustomers] = await db.execute(
        "SELECT COUNT(*) AS count FROM usuarios WHERE rol = 'CLIENTE' AND activo = 1",
    );

    res.json({
        data: {
            ordersToday: ordersToday[0].count,
            revenueToday: revenueToday[0].revenue,
            pendingOrders: pendingOrders[0].count,
            totalProducts: totalProducts[0].count,
            totalCustomers: totalCustomers[0].count,
        },
    });
});

exports.getSettings = asyncHandler(async (_req, res) => {
    const [settings] = await db.execute('SELECT clave, valor FROM configuracion_sistema');
    const map = {};
    settings.forEach((row) => {
        map[row.clave] = row.valor;
    });
    res.json({ data: map });
});

exports.updateSetting = asyncHandler(async (req, res) => {
    const { key, value } = req.body;

    await db.execute(
        `INSERT INTO configuracion_sistema (clave, valor) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE valor = ?, fecha_modificacion = CURRENT_TIMESTAMP`,
        [key, value, value],
    );

    res.json({ message: 'Setting updated' });
});
