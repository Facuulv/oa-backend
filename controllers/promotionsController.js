const db = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middlewares/errorHandler');

const PROMO_SELECT = `id,
        nombre AS name,
        descripcion AS description,
        tipo AS type,
        valor AS value,
        monto_minimo AS minPurchase,
        fecha_inicio AS startDate,
        fecha_fin AS endDate,
        activa AS active,
        fecha_creacion AS created_at,
        fecha_modificacion AS updated_at`;

exports.list = asyncHandler(async (_req, res) => {
    const [promotions] = await db.execute(`SELECT ${PROMO_SELECT} FROM promociones ORDER BY fecha_creacion DESC`);
    res.json({ data: promotions });
});

exports.listActive = asyncHandler(async (_req, res) => {
    const [promotions] = await db.execute(
        `SELECT ${PROMO_SELECT}
         FROM promociones
         WHERE activa = 1
           AND (fecha_inicio IS NULL OR fecha_inicio <= NOW())
           AND (fecha_fin IS NULL OR fecha_fin >= NOW())
         ORDER BY fecha_creacion DESC`,
    );
    res.json({ data: promotions });
});

exports.getById = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;

    const [rows] = await db.execute(`SELECT ${PROMO_SELECT} FROM promociones WHERE id = ?`, [id]);
    if (rows.length === 0) {
        throw new AppError('Promotion not found', 404, 'PROMOTION_NOT_FOUND');
    }

    res.json({ data: rows[0] });
});

exports.create = asyncHandler(async (req, res) => {
    const { name, description, type, value, minPurchase, startDate, endDate, active } = req.validatedData;

    const [result] = await db.execute(
        `INSERT INTO promociones (nombre, descripcion, tipo, valor, monto_minimo, fecha_inicio, fecha_fin, activa)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            name,
            description || null,
            type,
            value,
            minPurchase || 0,
            startDate || null,
            endDate || null,
            active ? 1 : 0,
        ],
    );

    res.status(201).json({ data: { id: result.insertId, name, type, value } });
});

exports.update = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    const fields = req.validatedData;

    const columnMap = {
        name: 'nombre',
        description: 'descripcion',
        type: 'tipo',
        value: 'valor',
        minPurchase: 'monto_minimo',
        startDate: 'fecha_inicio',
        endDate: 'fecha_fin',
        active: 'activa',
    };

    const setClauses = [];
    const values = [];

    for (const [key, val] of Object.entries(fields)) {
        const col = columnMap[key];
        if (!col) continue;
        setClauses.push(`${col} = ?`);
        values.push(typeof val === 'boolean' ? (val ? 1 : 0) : val);
    }

    if (setClauses.length === 0) {
        throw new AppError('No valid fields to update', 400, 'NO_FIELDS');
    }

    setClauses.push('fecha_modificacion = CURRENT_TIMESTAMP');
    values.push(id);
    await db.execute(`UPDATE promociones SET ${setClauses.join(', ')} WHERE id = ?`, values);

    res.json({ message: 'Promotion updated successfully' });
});

exports.remove = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    await db.execute('UPDATE promociones SET activa = 0, fecha_modificacion = CURRENT_TIMESTAMP WHERE id = ?', [
        id,
    ]);
    res.json({ message: 'Promotion deactivated successfully' });
});
