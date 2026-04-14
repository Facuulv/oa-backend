const { z } = require('zod');
const { ORDER_STATUS } = require('../config/constants');

const orderItemSchema = z.object({
    productId: z.number().int().positive(),
    quantity: z.number().int().min(1),
    unitPrice: z.number().positive(),
    notes: z.string().max(255).optional().nullable(),
});

const createOrderSchema = z.object({
    items: z.array(orderItemSchema).min(1, 'At least one item is required'),
    couponCode: z.string().optional().nullable(),
    deliveryAddress: z.string().max(500).optional().nullable(),
    customerName: z.string().min(1).max(100),
    customerEmail: z.string().email(),
    customerPhone: z.string().max(20).optional().nullable(),
    notes: z.string().max(500).optional().nullable(),
    tipoEntrega: z.enum(['ENVIO', 'RETIRO']).optional(),
    canalOrigen: z.string().max(50).optional(),
    /** @deprecated Prefer `tipoEntrega`. Se mapea a `tipo_entrega` en servidor. */
    paymentMethod: z.enum(['CASH', 'TRANSFER']).optional(),
});

const updateOrderStatusSchema = z.object({
    status: z.enum(Object.values(ORDER_STATUS)),
    reason: z.string().max(255).optional().nullable(),
});

module.exports = { createOrderSchema, updateOrderStatusSchema };
