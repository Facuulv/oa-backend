const db = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middlewares/errorHandler');
const couponRepository = require('../repositories/couponRepository');

const COUPON_ROW = `c.id,
        c.codigo AS code,
        c.promocion_id AS promotion_id,
        c.usos_maximos AS max_uses,
        c.usos_actuales AS current_uses,
        c.vence_en AS expires_at,
        c.activo AS active,
        c.fecha_creacion AS created_at,
        c.fecha_modificacion AS updated_at,
        p.nombre AS promotion_name,
        p.tipo AS promotion_type,
        p.valor AS promotion_value`;

exports.list = asyncHandler(async (_req, res) => {
    const [coupons] = await db.execute(
        `SELECT ${COUPON_ROW}
         FROM cupones c
         LEFT JOIN promociones p ON c.promocion_id = p.id
         ORDER BY c.fecha_creacion DESC`,
    );
    res.json({ data: coupons });
});

exports.getById = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;

    const [rows] = await db.execute(
        `SELECT ${COUPON_ROW}
         FROM cupones c
         LEFT JOIN promociones p ON c.promocion_id = p.id
         WHERE c.id = ?`,
        [id],
    );

    if (rows.length === 0) {
        throw new AppError('Coupon not found', 404, 'COUPON_NOT_FOUND');
    }

    res.json({ data: rows[0] });
});

exports.create = asyncHandler(async (req, res) => {
    const { code, promotionId, maxUses, expiresAt } = req.validatedData;

    const [existing] = await db.execute('SELECT id FROM cupones WHERE codigo = ?', [code]);
    if (existing.length > 0) {
        throw new AppError('Coupon code already exists', 409, 'CODE_EXISTS');
    }

    const [result] = await db.execute(
        'INSERT INTO cupones (codigo, promocion_id, usos_maximos, vence_en) VALUES (?, ?, ?, ?)',
        [code, promotionId, maxUses || 1, expiresAt || null],
    );

    res.status(201).json({ data: { id: result.insertId, code, promotionId } });
});

exports.update = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    const fields = req.validatedData;

    const columnMap = {
        code: 'codigo',
        promotionId: 'promocion_id',
        maxUses: 'usos_maximos',
        expiresAt: 'vence_en',
        active: 'activo',
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
    await db.execute(`UPDATE cupones SET ${setClauses.join(', ')} WHERE id = ?`, values);

    res.json({ message: 'Coupon updated successfully' });
});

exports.remove = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    await db.execute('UPDATE cupones SET activo = 0, fecha_modificacion = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    res.json({ message: 'Coupon deactivated successfully' });
});

/**
 * Public endpoint: validate a coupon code and return the associated promotion.
 */
exports.validateCoupon = asyncHandler(async (req, res) => {
    const { code } = req.validatedData;

    const coupon = await couponRepository.findActiveWithPromotionByCode(code);

    if (!coupon) {
        throw new AppError('Invalid or expired coupon', 404, 'COUPON_INVALID');
    }

    if (coupon.vence_en && new Date(coupon.vence_en) < new Date()) {
        throw new AppError('Coupon has expired', 410, 'COUPON_EXPIRED');
    }

    if (coupon.usos_maximos > 0 && coupon.usos_actuales >= coupon.usos_maximos) {
        throw new AppError('Coupon usage limit reached', 410, 'COUPON_LIMIT_REACHED');
    }

    res.json({
        valid: true,
        coupon: {
            code: coupon.codigo,
            promotionName: coupon.promotion_name,
            type: coupon.promotion_type,
            value: coupon.promotion_value,
            minPurchase: coupon.min_purchase,
        },
    });
});
