const { z } = require('zod');
const { opcionalImagenUrl } = require('./common');

const createCategorySchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    description: z.string().max(255).optional().nullable(),
    imagen_url: opcionalImagenUrl,
    sortOrder: z.number().int().min(0).optional().default(0),
});

const updateCategorySchema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(255).optional().nullable(),
    imagen_url: opcionalImagenUrl,
    sortOrder: z.number().int().min(0).optional(),
    active: z.boolean().optional(),
});

module.exports = { createCategorySchema, updateCategorySchema };
