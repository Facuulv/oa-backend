const { z } = require('zod');
const { ROLES, PAGINATION } = require('../config/constants');

const staffRoleEnum = z.enum([ROLES.ADMIN, ROLES.ENCARGADO, ROLES.VENDEDOR]);

const optionalDni = z.preprocess(
    (v) => {
        if (v === undefined) return undefined;
        if (v === null || v === '') return null;
        return String(v).trim();
    },
    z.union([z.string().min(1).max(32), z.null()]).optional(),
);

const createUserSchema = z.object({
    nombre: z.string().min(2, 'Nombre mínimo 2 caracteres').max(100),
    apellido: z.string().min(2, 'Apellido mínimo 2 caracteres').max(100),
    dni: optionalDni,
    email: z.string().email('Email válido requerido'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').max(128),
    rol: staffRoleEnum,
    telefono: z.string().max(20).optional().nullable(),
});

const updateUserSchema = z
    .object({
        nombre: z.string().min(2).max(100).optional(),
        apellido: z.string().min(2).max(100).optional(),
        dni: optionalDni,
        email: z.string().email().optional(),
        rol: staffRoleEnum.optional(),
        telefono: z.string().max(20).optional().nullable(),
        activo: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, { message: 'Debe enviar al menos un campo' });

const changePasswordSchema = z.object({
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').max(128),
});

const listUsuariosQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional().default(PAGINATION.DEFAULT_PAGE),
    limit: z.coerce
        .number()
        .int()
        .positive()
        .max(PAGINATION.MAX_LIMIT)
        .optional()
        .default(PAGINATION.DEFAULT_LIMIT),
    q: z.string().max(200).optional(),
    rol: staffRoleEnum.optional(),
    activo: z.enum(['0', '1']).optional(),
});

module.exports = {
    createUserSchema,
    updateUserSchema,
    changePasswordSchema,
    listUsuariosQuerySchema,
    staffRoleEnum,
};
