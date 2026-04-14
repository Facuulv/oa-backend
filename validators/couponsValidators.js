const { z } = require('zod');

const createCouponSchema = z.object({
    code: z
        .string()
        .min(3, 'Code must be at least 3 characters')
        .max(30)
        .transform((v) => v.toUpperCase()),
    promotionId: z.number().int().positive('Promotion ID is required'),
    maxUses: z.number().int().min(1).optional().default(1),
    expiresAt: z.string().datetime({ offset: true }).optional().nullable(),
});

const updateCouponSchema = z.object({
    code: z
        .string()
        .min(3)
        .max(30)
        .transform((v) => v.toUpperCase())
        .optional(),
    promotionId: z.number().int().positive().optional(),
    maxUses: z.number().int().min(1).optional(),
    expiresAt: z.string().datetime({ offset: true }).optional().nullable(),
    active: z.boolean().optional(),
});

const validateCouponSchema = z.object({
    code: z.string().min(1, 'Coupon code is required').transform((v) => v.toUpperCase()),
});

module.exports = { createCouponSchema, updateCouponSchema, validateCouponSchema };
