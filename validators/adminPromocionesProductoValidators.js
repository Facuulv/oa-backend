const { z } = require('zod');
const { opcionalImagenUrl } = require('./common');
const {
    productoIdParamSchema,
    listadoProductosQuerySchema,
    crearProductoSchema,
    actualizarProductoSchema,
    actualizarEstadoProductoSchema,
} = require('./adminProductosValidators');

const listadoPromocionesProductoQuerySchema = listadoProductosQuerySchema.omit({ tipo_producto: true });

const componentePromoSchema = z.object({
    producto_hijo_id: z.coerce.number().int().positive('El id del componente debe ser un entero positivo'),
    cantidad: z.coerce
        .number({ invalid_type_error: 'La cantidad debe ser un número' })
        .int('La cantidad debe ser un número entero')
        .positive('La cantidad debe ser mayor a cero'),
});

const crearPromocionProductoSchema = crearProductoSchema.extend({
    componentes: z
        .array(componentePromoSchema)
        .min(1, 'Debe indicar al menos un componente')
        .max(50, 'Demasiados componentes'),
});

const actualizarPromocionProductoSchema = actualizarProductoSchema
    .innerType()
    .extend({
        componentes: z.array(componentePromoSchema).max(50, 'Demasiados componentes').optional(),
    })
    .refine((obj) => Object.keys(obj).length > 0, {
        message: 'Debe enviar al menos un campo para actualizar',
    })
    .refine(
        (obj) =>
            !Object.prototype.hasOwnProperty.call(obj, 'componentes') ||
            obj.componentes === undefined ||
            obj.componentes.length > 0,
        { message: 'Si envía componentes, debe haber al menos uno', path: ['componentes'] },
    );

module.exports = {
    productoIdParamSchema,
    listadoPromocionesProductoQuerySchema,
    crearPromocionProductoSchema,
    actualizarPromocionProductoSchema,
    actualizarEstadoProductoSchema,
    componentePromoSchema,
};
