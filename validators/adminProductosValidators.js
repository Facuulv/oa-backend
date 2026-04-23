const { z } = require('zod');
const { opcionalImagenUrl } = require('./common');

const trim = (v) => (typeof v === 'string' ? v.trim() : v);

const productoIdParamSchema = z.object({
    id: z
        .string()
        .regex(/^\d+$/, 'El id debe ser un número entero positivo')
        .transform(Number)
        .refine((n) => Number.isInteger(n) && n > 0, 'El id debe ser mayor a cero'),
});

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

/** Filtro de query opcional (true/false); `all` o `todos` no aplica filtro. */
const queryFiltroBooleano = z.preprocess((v) => {
    if (v === undefined || v === '' || v === null) return undefined;
    if (typeof v === 'string') {
        const t = v.trim().toLowerCase();
        if (t === 'true' || t === '1' || t === 'yes' || t === 'si' || t === 'sí') return true;
        if (t === 'false' || t === '0' || t === 'no') return false;
        if (t === 'all' || t === 'todos') return undefined;
    }
    if (v === 1) return true;
    if (v === 0) return false;
    return v;
}, z.boolean().optional());

const precioProducto = z.preprocess(
    (v) => {
        if (v === '' || v === null) return undefined;
        return v;
    },
    z.coerce
        .number({ invalid_type_error: 'El precio debe ser un número' })
        .min(0, 'El precio no puede ser negativo')
        .max(99999999.99, 'El precio es demasiado alto')
        .refine((n) => Number.isFinite(n), 'El precio no es válido'),
);

const stockProducto = z.preprocess((v) => {
    if (v === '' || v === null || v === undefined) return 0;
    if (typeof v === 'string' && trim(v) !== '') return Number(trim(v));
    return v;
}, z.coerce.number({ invalid_type_error: 'El stock debe ser un número' }).int('El stock debe ser un número entero').min(0, 'El stock no puede ser negativo'));

const ordenProducto = z.preprocess((v) => {
    if (v === '' || v === null || v === undefined) return 0;
    if (typeof v === 'string' && trim(v) !== '') return Number(trim(v));
    return v;
}, z.coerce.number({ invalid_type_error: 'El orden debe ser un número' }).int('El orden debe ser un número entero').min(0, 'El orden no puede ser negativo'));

const descripcionProducto = z.preprocess((v) => {
    if (v === undefined) return undefined;
    if (v === null) return null;
    if (typeof v !== 'string') return v;
    const t = v.trim();
    return t.length === 0 ? null : t;
}, z.union([z.string().max(500, 'La descripción no puede superar 500 caracteres'), z.null()]).optional());

const nombreProducto = z.preprocess(
    trim,
    z
        .string({ required_error: 'El nombre es obligatorio' })
        .min(1, 'El nombre no puede estar vacío')
        .max(150, 'El nombre no puede superar 150 caracteres'),
);

const categoriaIdProducto = z.coerce
    .number({ invalid_type_error: 'La categoría es obligatoria' })
    .int('La categoría debe ser un id entero')
    .positive('La categoría debe ser un id válido');

/** Entero >= 1 con fallback seguro (query string hostil o vacío). */
const queryPage = z.preprocess((v) => {
    if (v === '' || v === null || v === undefined) return 1;
    const n = Number(v);
    if (!Number.isFinite(n)) return 1;
    const i = Math.trunc(n);
    return i < 1 ? 1 : i;
}, z.number().int());

/** Entero 1..100 con fallback seguro. */
const queryLimit = z.preprocess((v) => {
    if (v === '' || v === null || v === undefined) return 20;
    const n = Number(v);
    if (!Number.isFinite(n)) return 20;
    let i = Math.trunc(n);
    if (i < 1) i = 1;
    if (i > 100) i = 100;
    return i;
}, z.number().int());

/** Debe coincidir con `SORT_SQL` en `productoRepository` (ORDER BY seguro). */
const ORDENAR_ADMIN = [
    'nombre_asc',
    'nombre_desc',
    'precio_asc',
    'precio_desc',
    'fecha_desc',
    'fecha_asc',
    'orden_asc',
    'orden_desc',
];

const listadoOrdenar = z.preprocess((v) => {
    if (v === undefined || v === null || v === '') return 'orden_asc';
    const raw = typeof v === 'string' ? v.trim() : String(v);
    return ORDENAR_ADMIN.includes(raw) ? raw : 'orden_asc';
}, z.enum(ORDENAR_ADMIN));

const listadoProductosQuerySchema = z.object({
    busqueda: z.preprocess((v) => {
        if (v === undefined || v === null || v === '') return undefined;
        return typeof v === 'string' ? v.trim() : v;
    }, z.string().min(1).max(150).optional()),
    categoria_id: z.preprocess((v) => {
        if (v === undefined || v === '' || v === null) return undefined;
        return v;
    }, z.coerce.number().int().positive().optional()),
    activo: queryFiltroBooleano,
    destacado: queryFiltroBooleano,
    disponible: queryFiltroBooleano,
    ordenar: listadoOrdenar.default('orden_asc'),
    page: queryPage.default(1),
    limit: queryLimit.default(20),
});

const crearProductoSchema = z.object({
    categoria_id: categoriaIdProducto,
    nombre: nombreProducto,
    descripcion: descripcionProducto,
    precio: precioProducto,
    stock: stockProducto.optional().default(0),
    imagen_url: opcionalImagenUrl,
    destacado: activoBooleano().optional().default(false),
    disponible: activoBooleano().optional().default(true),
    activo: activoBooleano().optional().default(true),
    orden: ordenProducto.optional().default(0),
});

const actualizarProductoSchema = z
    .object({
        categoria_id: categoriaIdProducto.optional(),
        nombre: z.preprocess(trim, z.string().min(1, 'El nombre no puede estar vacío').max(150).optional()),
        descripcion: descripcionProducto,
        precio: z.preprocess(
            (v) => {
                if (v === undefined) return undefined;
                if (v === '' || v === null) return undefined;
                return v;
            },
            z.coerce
                .number({ invalid_type_error: 'El precio debe ser un número' })
                .min(0, 'El precio no puede ser negativo')
                .max(99999999.99, 'El precio es demasiado alto')
                .refine((n) => Number.isFinite(n), 'El precio no es válido')
                .optional(),
        ),
        stock: z.preprocess((v) => {
            if (v === undefined) return undefined;
            if (v === '' || v === null) return undefined;
            if (typeof v === 'string' && trim(v) !== '') return Number(trim(v));
            return v;
        }, z.coerce.number().int().min(0).optional()),
        imagen_url: opcionalImagenUrl,
        destacado: activoBooleano().optional(),
        disponible: activoBooleano().optional(),
        activo: activoBooleano().optional(),
        orden: ordenProducto.optional(),
    })
    .refine((obj) => Object.keys(obj).length > 0, {
        message: 'Debe enviar al menos un campo para actualizar',
    });

const actualizarEstadoProductoSchema = z.object({
    activo: activoBooleano({
        required_error: 'El campo activo es obligatorio',
        invalid_type_error: 'El campo activo debe ser verdadero o falso',
    }),
});

module.exports = {
    productoIdParamSchema,
    listadoProductosQuerySchema,
    crearProductoSchema,
    actualizarProductoSchema,
    actualizarEstadoProductoSchema,
};
