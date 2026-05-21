const { z } = require('zod');
const { ORDER_STATUS } = require('../config/constants');
const { normalizeTipoEntrega } = require('../utils/orderHelpers');
const { MAX_ITEMS_PER_ORDER, MAX_QUANTITY_PER_LINE } = require('../services/normalizeOrderItems');
const { MAX_COMBO_LABELS } = require('../utils/appendComboTraceToNotes');

const positiveFiniteInt = z
    .number({ invalid_type_error: 'Debe ser un número entero' })
    .finite('Debe ser un número finito')
    .int('Debe ser un número entero')
    .positive('Debe ser mayor a cero');

const orderItemSchema = z.object({
    productId: positiveFiniteInt,
    quantity: positiveFiniteInt.max(
        MAX_QUANTITY_PER_LINE,
        `La cantidad no puede superar ${MAX_QUANTITY_PER_LINE}`,
    ),
    unitPrice: z
        .number({ invalid_type_error: 'Debe ser un número' })
        .finite('El precio unitario debe ser un número finito')
        .positive('El precio unitario debe ser mayor a cero'),
    notes: z.string().max(255).optional().nullable(),
});

const createOrderSchema = z.object({
    items: z
        .array(orderItemSchema)
        .min(1, 'At least one item is required')
        .max(MAX_ITEMS_PER_ORDER, `El pedido no puede superar ${MAX_ITEMS_PER_ORDER} líneas`),
    couponCode: z.string().optional().nullable(),
    deliveryAddress: z.string().max(500).optional().nullable(),
    customerName: z.string().min(1).max(100),
    customerEmail: z.string().email(),
    customerPhone: z.string().max(20).optional().nullable(),
    notes: z.string().max(500).optional().nullable(),
    /** Nombres visibles de combos personalizados (carrito expandido en items). Solo trazabilidad en observaciones. */
    comboLabels: z
        .array(z.string().trim().min(1).max(80))
        .max(MAX_COMBO_LABELS)
        .optional(),
    tipoEntrega: z
        .preprocess(
            (v) => normalizeTipoEntrega(v) ?? v,
            z.enum(['DELIVERY', 'RETIRO']),
        )
        .optional(),
    canalOrigen: z.string().max(50).optional(),
    /** @deprecated Prefer `tipoEntrega`. Se mapea a `tipo_entrega` en servidor. */
    paymentMethod: z.enum(['CASH', 'TRANSFER']).optional(),
});

const updateOrderStatusSchema = z.object({
    status: z.enum(Object.values(ORDER_STATUS)),
    reason: z.string().max(255).optional().nullable(),
});

module.exports = { createOrderSchema, updateOrderStatusSchema };
