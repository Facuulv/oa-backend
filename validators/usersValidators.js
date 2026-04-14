const { z } = require('zod');
const { ROLES } = require('../config/constants');

const createUserSchema = z.object({
    nombre: z.string().min(2).max(100),
    apellido: z.string().min(2).max(100),
    email: z.string().email(),
    password: z.string().min(6).max(128),
    rol: z.enum([ROLES.ADMIN, ROLES.CLIENTE]).default(ROLES.CLIENTE),
    telefono: z.string().max(20).optional().nullable(),
});

const updateUserSchema = z.object({
    nombre: z.string().min(2).max(100).optional(),
    apellido: z.string().min(2).max(100).optional(),
    email: z.string().email().optional(),
    rol: z.enum([ROLES.ADMIN, ROLES.CLIENTE]).optional(),
    telefono: z.string().max(20).optional().nullable(),
    activo: z.boolean().optional(),
});

module.exports = { createUserSchema, updateUserSchema };
