const { z } = require('zod');
const { opcionalImagenUrl } = require('./common');

const trim = (v) => (typeof v === 'string' ? v.trim() : v);

/** Id de ruta para ABM admin de categorías (mensajes en español). */
const categoriaIdParamSchema = z.object({
    id: z
        .string()
        .regex(/^\d+$/, 'El id debe ser un número entero positivo')
        .transform(Number)
        .refine((n) => Number.isInteger(n) && n > 0, 'El id debe ser mayor a cero'),
});

const descripcionOpcional = z.preprocess((v) => {
    if (v === undefined) return undefined;
    if (v === null) return null;
    if (typeof v !== 'string') return v;
    const t = v.trim();
    return t.length === 0 ? null : t;
}, z.union([z.string().max(255, 'La descripción no puede superar 255 caracteres'), z.null()]).optional());

const ordenCategoria = z.preprocess((v) => {
    if (v === '' || v === null || v === undefined) return 0;
    if (typeof v === 'string' && trim(v) !== '') return Number(trim(v));
    return v;
}, z.coerce.number({ invalid_type_error: 'El orden debe ser un número' }).int('El orden debe ser un número entero').min(0, 'El orden no puede ser negativo'));

const activoBooleano = (opts = {}) =>
    z.preprocess((v) => {
        if (v === undefined) return v;
        if (typeof v === 'string') {
            const t = v.trim().toLowerCase();
            if (t === 'true' || t === '1' || t === 'yes' || t === 'si' || t === 'sí') return true;
            if (t === 'false' || t === '0' || t === 'no') return false;
        }
        if (v === 1) return true;
        if (v === 0) return false;
        return v;
    }, z.boolean(opts));

const nombreCategoria = z.preprocess(
    trim,
    z
        .string({ required_error: 'El nombre es obligatorio' })
        .min(1, 'El nombre no puede estar vacío')
        .max(100, 'El nombre no puede superar 100 caracteres'),
);

const crearCategoriaSchema = z.object({
    nombre: nombreCategoria,
    descripcion: descripcionOpcional,
    imagen_url: opcionalImagenUrl,
    orden: ordenCategoria.optional().default(0),
    activo: activoBooleano().optional().default(true),
});

const actualizarCategoriaSchema = z
    .object({
        nombre: z.preprocess(trim, z.string().min(1, 'El nombre no puede estar vacío').max(100).optional()),
        descripcion: descripcionOpcional,
        imagen_url: opcionalImagenUrl,
        orden: ordenCategoria.optional(),
        activo: activoBooleano().optional(),
    })
    .refine((obj) => Object.keys(obj).length > 0, {
        message: 'Debe enviar al menos un campo para actualizar',
    });

const actualizarEstadoCategoriaSchema = z.object({
    activo: activoBooleano({ required_error: 'El campo activo es obligatorio', invalid_type_error: 'El campo activo debe ser verdadero o falso' }),
});

module.exports = {
    categoriaIdParamSchema,
    crearCategoriaSchema,
    actualizarCategoriaSchema,
    actualizarEstadoCategoriaSchema,
};
