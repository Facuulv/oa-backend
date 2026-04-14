const { z } = require('zod');
const { PROMOTION_TYPES } = require('../config/constants');

const promotionTypeEnum = z.enum([
    PROMOTION_TYPES.PERCENTAGE,
    PROMOTION_TYPES.FIXED,
    PROMOTION_TYPES.BUY_X_GET_Y,
]);

const createPromotionSchema = z.object({
    name: z.string().min(1, 'Name is required').max(150),
    description: z.string().max(500).optional().nullable(),
    type: promotionTypeEnum,
    value: z.number().min(0, 'Value must be >= 0'),
    minPurchase: z.number().min(0).optional().default(0),
    startDate: z.string().datetime({ offset: true }).optional().nullable(),
    endDate: z.string().datetime({ offset: true }).optional().nullable(),
    active: z.boolean().optional().default(true),
});

const updatePromotionSchema = z.object({
    name: z.string().min(1).max(150).optional(),
    description: z.string().max(500).optional().nullable(),
    type: promotionTypeEnum.optional(),
    value: z.number().min(0).optional(),
    minPurchase: z.number().min(0).optional(),
    startDate: z.string().datetime({ offset: true }).optional().nullable(),
    endDate: z.string().datetime({ offset: true }).optional().nullable(),
    active: z.boolean().optional(),
});

module.exports = { createPromotionSchema, updatePromotionSchema };
