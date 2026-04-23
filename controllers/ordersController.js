const db = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middlewares/errorHandler');
const { ORDER_STATUS } = require('../config/constants');
const couponRepository = require('../repositories/couponRepository');
const { computeDiscountAmount, resolveTipoEntrega, resolveCanalOrigen } = require('../utils/orderHelpers');

const ORDER_LIST_SELECT = `o.id,
        o.usuario_id AS user_id,
        o.cliente_nombre AS customer_name,
        o.cliente_email AS customer_email,
        o.cliente_telefono AS customer_phone,
        o.tipo_entrega,
        o.direccion_entrega AS delivery_address,
        o.subtotal,
        o.descuento AS discount,
        o.total,
        o.codigo_cupon AS coupon_code,
        o.observaciones AS notes,
        o.estado AS status,
        o.canal_origen,
        o.fecha_creacion AS created_at,
        o.fecha_modificacion AS updated_at`;

exports.list = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const status = req.query.status;

    let where = '1=1';
    const params = [];

    if (status && Object.values(ORDER_STATUS).includes(status)) {
        where += ' AND o.estado = ?';
        params.push(status);
    }

    const [orders] = await db.execute(
        `SELECT ${ORDER_LIST_SELECT},
                CONCAT_WS(' ', u.nombre, u.apellido) AS customer_name_user,
                u.email AS customer_email_user
         FROM pedidos o
         LEFT JOIN usuarios u ON o.usuario_id = u.id
         WHERE ${where}
         ORDER BY o.fecha_creacion DESC
         LIMIT ? OFFSET ?`,
        [...params, String(limit), String(offset)],
    );

    const [countResult] = await db.execute(`SELECT COUNT(*) as total FROM pedidos o WHERE ${where}`, params);

    res.json({
        data: orders,
        pagination: { page, limit, total: countResult[0].total },
    });
});

exports.getById = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;

    const [orders] = await db.execute(
        `SELECT ${ORDER_LIST_SELECT} FROM pedidos o WHERE o.id = ?`,
        [id],
    );
    if (orders.length === 0) {
        throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    const [items] = await db.execute(
        `SELECT pd.id,
                pd.pedido_id AS order_id,
                pd.producto_id AS product_id,
                pd.nombre_producto AS product_name,
                pd.cantidad AS quantity,
                pd.precio_unitario AS unit_price,
                pd.subtotal,
                pd.observaciones AS notes,
                pd.fecha_creacion AS created_at
         FROM pedidos_detalle pd
         WHERE pd.pedido_id = ?`,
        [id],
    );

    res.json({ data: { ...orders[0], items } });
});

exports.create = asyncHandler(async (req, res) => {
    const data = req.validatedData;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const productIds = [...new Set(data.items.map((i) => i.productId))];
        const placeholders = productIds.map(() => '?').join(',');
        const [productRows] = await connection.execute(
            `SELECT id, nombre, precio, stock FROM productos WHERE id IN (${placeholders}) AND activo = 1`,
            productIds,
        );
        const productMap = new Map(productRows.map((p) => [p.id, p]));
        for (const id of productIds) {
            if (!productMap.has(id)) {
                throw new AppError('Producto inválido o inactivo', 400, 'INVALID_PRODUCT');
            }
        }

        const qtyByProduct = new Map();
        for (const item of data.items) {
            qtyByProduct.set(item.productId, (qtyByProduct.get(item.productId) || 0) + item.quantity);
        }
        for (const [pid, qty] of qtyByProduct) {
            if (Number(productMap.get(pid).stock) < qty) {
                throw new AppError('Stock insuficiente', 409, 'INSUFFICIENT_STOCK');
            }
        }

        const subtotal = Math.round(
            data.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) * 100,
        ) / 100;

        let descuento = 0;
        let couponRow = null;
        if (data.couponCode) {
            couponRow = await couponRepository.findActiveWithPromotionByCode(data.couponCode, {
                connection,
            });
            if (!couponRow) {
                throw new AppError('Cupón inválido', 400, 'COUPON_INVALID');
            }
            if (couponRow.vence_en && new Date(couponRow.vence_en) < new Date()) {
                throw new AppError('Cupón vencido', 400, 'COUPON_EXPIRED');
            }
            if (couponRow.usos_maximos > 0 && couponRow.usos_actuales >= couponRow.usos_maximos) {
                throw new AppError('Cupón sin usos disponibles', 400, 'COUPON_LIMIT_REACHED');
            }
            if (!['PERCENTAGE', 'FIXED'].includes(couponRow.promotion_type)) {
                throw new AppError('Tipo de promoción no aplicable al checkout', 400, 'PROMO_UNSUPPORTED');
            }
            const disc = computeDiscountAmount(
                subtotal,
                { type: couponRow.promotion_type, value: couponRow.promotion_value },
                Number(couponRow.min_purchase) || 0,
            );
            if (!disc.ok) {
                throw new AppError('No alcanza el monto mínimo para este cupón', 400, 'MIN_PURCHASE_NOT_MET');
            }
            descuento = disc.amount;
        }

        const total = Math.round((subtotal - descuento) * 100) / 100;
        if (total < 0) {
            throw new AppError('Total inválido', 400, 'INVALID_TOTAL');
        }

        const tipoEntrega = resolveTipoEntrega(data);
        const canalOrigen = resolveCanalOrigen(data);

        const [orderResult] = await connection.execute(
            `INSERT INTO pedidos
             (usuario_id, cliente_id, cliente_nombre, cliente_email, cliente_telefono, tipo_entrega, direccion_entrega,
              subtotal, descuento, total, codigo_cupon, observaciones, estado, canal_origen)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.auth?.origen === 'ADMIN' ? req.auth.id : null,
                req.auth?.origen === 'CLIENTE' ? req.auth.id : null,
                data.customerName,
                data.customerEmail,
                data.customerPhone || null,
                tipoEntrega,
                data.deliveryAddress || null,
                subtotal,
                descuento,
                total,
                data.couponCode || null,
                data.notes || null,
                ORDER_STATUS.PENDING,
                canalOrigen,
            ],
        );

        const orderId = orderResult.insertId;

        for (const item of data.items) {
            const prod = productMap.get(item.productId);
            const lineSubtotal = Math.round(item.unitPrice * item.quantity * 100) / 100;
            const [upd] = await connection.execute(
                'UPDATE productos SET stock = stock - ? WHERE id = ? AND stock >= ?',
                [item.quantity, item.productId, item.quantity],
            );
            if (upd.affectedRows === 0) {
                throw new AppError('Stock insuficiente', 409, 'INSUFFICIENT_STOCK');
            }
            await connection.execute(
                `INSERT INTO pedidos_detalle
                 (pedido_id, producto_id, nombre_producto, cantidad, precio_unitario, subtotal, observaciones)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    orderId,
                    item.productId,
                    prod.nombre,
                    item.quantity,
                    item.unitPrice,
                    lineSubtotal,
                    item.notes || null,
                ],
            );
        }

        if (couponRow) {
            await connection.execute('UPDATE cupones SET usos_actuales = usos_actuales + 1 WHERE id = ?', [
                couponRow.id,
            ]);
        }

        await connection.commit();

        res.status(201).json({
            data: { id: orderId, status: ORDER_STATUS.PENDING, total },
        });
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
});

exports.updateStatus = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    const { status } = req.validatedData;

    const [orders] = await db.execute('SELECT estado FROM pedidos WHERE id = ?', [id]);
    if (orders.length === 0) {
        throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    await db.execute('UPDATE pedidos SET estado = ?, fecha_modificacion = CURRENT_TIMESTAMP WHERE id = ?', [
        status,
        id,
    ]);

    res.json({ message: 'Order status updated', data: { id: Number(id), status } });
});

exports.myOrders = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const clienteId = req.cliente?.id ?? (req.auth?.origen === 'CLIENTE' ? req.auth.id : null);
    if (!clienteId) {
        throw new AppError('Cliente no autenticado', 401, 'NOT_AUTHENTICATED');
    }

    const [orders] = await db.execute(
        `SELECT ${ORDER_LIST_SELECT}
         FROM pedidos o
         WHERE o.cliente_id = ?
         ORDER BY o.fecha_creacion DESC
         LIMIT ? OFFSET ?`,
        [clienteId, String(limit), String(offset)],
    );

    res.json({ data: orders });
});
