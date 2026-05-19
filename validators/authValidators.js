const { z } = require('zod');
const { clienteDniSchema, optionalBirthDate } = require('./clientesProfileValidators');

const loginSchema = z.object({
    email: z.string().email('Email válido requerido'),
    password: z.string().min(1, 'La contraseña es obligatoria'),
});

const registerSchemaBase = z.object({
    nombre: z.string().min(2, 'Nombre mínimo 2 caracteres').max(100),
    apellido: z.string().min(2, 'Apellido mínimo 2 caracteres').max(100),
    dni: clienteDniSchema,
    email: z.string().email('Email válido requerido'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').max(128),
    telefono: z.string().max(20).optional().nullable(),
    fecha_nacimiento: optionalBirthDate,
    useCookie: z.boolean().optional().default(false),
});

const registerBirthDateRefine = (data) => {
    if (data.fecha_nacimiento == null || data.fecha_nacimiento === undefined) return true;
    const d =
        data.fecha_nacimiento instanceof Date ? data.fecha_nacimiento : new Date(data.fecha_nacimiento);
    if (Number.isNaN(d.getTime())) return false;
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return d <= today;
};

const registerBirthDateRefineOpts = {
    message: 'La fecha de nacimiento no puede ser futura',
    path: ['fecha_nacimiento'],
};

const registerSchema = registerSchemaBase.refine(registerBirthDateRefine, registerBirthDateRefineOpts);

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
    registerSchemaBase,
    registerBirthDateRefine,
    registerBirthDateRefineOpts,
    forgotPasswordSchema,
    resetPasswordSchema,
};
