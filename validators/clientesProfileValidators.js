const { z } = require('zod');

const clienteDniSchema = z
    .string()
    .trim()
    .regex(/^\d+$/, 'El DNI solo puede contener números')
    .min(7, 'El DNI debe tener al menos 7 dígitos')
    .max(10, 'El DNI no puede superar 10 dígitos');

const optionalBirthDate = z.preprocess(
    (v) => {
        if (v === undefined) return undefined;
        if (v === null || v === '') return null;
        return v;
    },
    z.union([z.coerce.date(), z.null()]).optional(),
);

const optionalTelefono = z.preprocess(
    (v) => {
        if (v === undefined) return undefined;
        if (v === null || v === '') return null;
        return String(v).trim();
    },
    z.union([z.string().max(20), z.null()]).optional(),
);

const updateClienteProfileSchema = z
    .object({
        nombre: z.string().min(2, 'Nombre mínimo 2 caracteres').max(100).optional(),
        apellido: z.string().min(2, 'Apellido mínimo 2 caracteres').max(100).optional(),
        telefono: optionalTelefono,
        dni: clienteDniSchema.optional(),
        fecha_nacimiento: optionalBirthDate,
        email: z.never({ errorMap: () => ({ message: 'El email no se puede modificar' }) }).optional(),
        password: z.never({ errorMap: () => ({ message: 'La contraseña no se modifica aquí' }) }).optional(),
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0, { message: 'Debe enviar al menos un campo' })
    .refine(
        (data) => {
            if (data.fecha_nacimiento == null) return true;
            const d = data.fecha_nacimiento instanceof Date ? data.fecha_nacimiento : new Date(data.fecha_nacimiento);
            if (Number.isNaN(d.getTime())) return false;
            const today = new Date();
            today.setHours(23, 59, 59, 999);
            return d <= today;
        },
        { message: 'La fecha de nacimiento no puede ser futura', path: ['fecha_nacimiento'] },
    );

module.exports = {
    clienteDniSchema,
    optionalBirthDate,
    updateClienteProfileSchema,
};
