const { z } = require('zod');

/** URL de imagen opcional; alinea con columna `imagen_url` VARCHAR(500). */
const opcionalImagenUrl = z.preprocess((v) => {
    if (v === undefined) return undefined;
    if (v === '' || v === null) return null;
    return v;
}, z.union([z.null(), z.string().max(500).url()]).optional());

const idParamSchema = z.object({
    id: z
        .string()
        .regex(/^\d+$/, 'ID must be a number')
        .transform(Number),
});

module.exports = { idParamSchema, opcionalImagenUrl };
