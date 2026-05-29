const { z } = require('zod');

const activoBooleano = z.preprocess((v) => {
    if (v === undefined) return v;
    if (typeof v === 'string') {
        const t = v.trim().toLowerCase();
        if (['true', '1', 'yes', 'si', 'sí'].includes(t)) return true;
        if (['false', '0', 'no'].includes(t)) return false;
    }
    if (v === 1) return true;
    if (v === 0) return false;
    return v;
}, z.boolean());

const franjaSchema = z.object({
    hora_apertura: z
        .string()
        .trim()
        .regex(/^([01]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'hora_apertura debe tener formato HH:mm'),
    hora_cierre: z
        .string()
        .trim()
        .regex(/^([01]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'hora_cierre debe tener formato HH:mm'),
    activo: activoBooleano,
});

const updateCartaSettingsSchema = z
    .object({
        cartaOnlineHabilitada: activoBooleano.optional(),
        validarHorarios: activoBooleano.optional(),
        /** Alias snake_case para compatibilidad */
        CARTA_ONLINE_HABILITADA: activoBooleano.optional(),
        VALIDAR_HORARIOS_CHECKOUT: activoBooleano.optional(),
    })
    .transform((data) => ({
        cartaOnlineHabilitada:
            data.cartaOnlineHabilitada ?? data.CARTA_ONLINE_HABILITADA,
        validarHorarios: data.validarHorarios ?? data.VALIDAR_HORARIOS_CHECKOUT,
    }))
    .refine(
        (data) =>
            data.cartaOnlineHabilitada !== undefined || data.validarHorarios !== undefined,
        { message: 'Debe enviar al menos un campo para actualizar' },
    );

const updateHorarioDiaSchema = z.object({
    dia_semana: z.coerce
        .number()
        .int('dia_semana debe ser entero')
        .min(0, 'dia_semana mínimo 0 (Domingo)')
        .max(6, 'dia_semana máximo 6 (Sábado)'),
    franjas: z.array(franjaSchema).max(4, 'Máximo 4 franjas por día'),
});

const updateWhatsappSchema = z.object({
    numero: z.string().min(1, 'El número es obligatorio'),
});

const stripHtml = (value) =>
    String(value ?? '')
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();

const optionalTextoIntro = z.preprocess((v) => {
    if (v === undefined || v === null) return '';
    return stripHtml(v);
}, z.string().max(2000, 'El texto introductorio no puede superar 2000 caracteres'));

const updateEmailRecuperacionSchema = z.object({
    nombre: z
        .string()
        .trim()
        .min(1, 'El nombre visible es obligatorio')
        .max(100, 'El nombre no puede superar 100 caracteres')
        .transform(stripHtml),
    asunto: z
        .string()
        .trim()
        .min(1, 'El asunto es obligatorio')
        .max(200, 'El asunto no puede superar 200 caracteres')
        .transform(stripHtml),
    textoIntro: optionalTextoIntro,
});

module.exports = {
    updateCartaSettingsSchema,
    updateHorarioDiaSchema,
    updateWhatsappSchema,
    updateEmailRecuperacionSchema,
};
