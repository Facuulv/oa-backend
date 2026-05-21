const { z } = require('zod');

const comboPayloadSchema = z
    .object({
        name: z.string().trim().min(1).max(80).optional(),
        label: z.string().trim().min(1).max(160).optional(),
        total: z.coerce.number().finite().min(0).optional(),
        base: z.unknown().optional().nullable(),
        mixer: z.unknown().optional().nullable(),
        extras: z.record(z.string(), z.unknown()).optional(),
        /** @deprecated Legacy; hielo va en `extras` con producto_id real. */
        iceBags: z.coerce.number().int().min(0).max(50).optional(),
        /** @deprecated Legacy mapa de hielo; preferir `extras`. */
        ice: z.record(z.string(), z.unknown()).optional(),
        items: z.array(z.unknown()).optional(),
    })
    .strict()
    .refine((value) => Object.keys(value).length > 0, {
        message: 'Debe enviar datos del combo',
    });

module.exports = {
    comboPayloadSchema,
};
