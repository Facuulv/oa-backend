const { z } = require('zod');

const createProductSchema = z.object({
    categoryId: z.number().int().positive('Category ID is required'),
    name: z.string().min(1, 'Name is required').max(150),
    description: z.string().max(500).optional().nullable(),
    price: z.number().positive('Price must be greater than 0').max(99999999.99),
    stock: z.number().int().min(0).optional().default(0),
    imageUrl: z.string().url().optional().nullable(),
    available: z.boolean().optional().default(true),
    featured: z.boolean().optional().default(false),
    sortOrder: z.number().int().min(0).optional().default(0),
});

const updateProductSchema = z.object({
    categoryId: z.number().int().positive().optional(),
    name: z.string().min(1).max(150).optional(),
    description: z.string().max(500).optional().nullable(),
    price: z.number().positive().max(99999999.99).optional(),
    stock: z.number().int().min(0).optional(),
    imageUrl: z.string().url().optional().nullable(),
    available: z.boolean().optional(),
    featured: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
});

module.exports = { createProductSchema, updateProductSchema };
