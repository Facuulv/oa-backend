const { z } = require('zod');

const loginSchema = z.object({
    email: z.string().email('Email válido requerido'),
    password: z.string().min(1, 'La contraseña es obligatoria'),
});

const registerSchema = z.object({
    nombre: z.string().min(2, 'Nombre mínimo 2 caracteres').max(100),
    apellido: z.string().min(2, 'Apellido mínimo 2 caracteres').max(100),
    email: z.string().email('Email válido requerido'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').max(128),
    telefono: z.string().max(20).optional().nullable(),
    useCookie: z.boolean().optional().default(false),
});

const forgotPasswordSchema = z.object({
    email: z.string().trim().email('Email válido requerido'),
});

const resetPasswordSchema = z.object({
    token: z.string().trim().min(1, 'El token es obligatorio'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(128),
});

module.exports = {
    loginSchema,
    registerSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
};
