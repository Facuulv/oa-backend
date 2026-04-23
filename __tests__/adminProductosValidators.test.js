const {
    crearProductoSchema,
    actualizarProductoSchema,
    listadoProductosQuerySchema,
    productoIdParamSchema,
} = require('../validators/adminProductosValidators');

describe('adminProductosValidators', () => {
    describe('crearProductoSchema', () => {
        const validBase = {
            categoria_id: 1,
            nombre: 'Producto test',
            precio: 100,
        };

        it('acepta payload mínimo con defaults', () => {
            const out = crearProductoSchema.parse(validBase);
            expect(out.nombre).toBe('Producto test');
            expect(out.stock).toBe(0);
            expect(out.destacado).toBe(false);
            expect(out.disponible).toBe(true);
            expect(out.activo).toBe(true);
            expect(out.orden).toBe(0);
        });

        it('rechaza nombre vacío', () => {
            expect(() => crearProductoSchema.parse({ ...validBase, nombre: '   ' })).toThrow();
        });

        it('rechaza precio negativo', () => {
            expect(() => crearProductoSchema.parse({ ...validBase, precio: -1 })).toThrow();
        });

        it('rechaza stock negativo', () => {
            expect(() => crearProductoSchema.parse({ ...validBase, stock: -3 })).toThrow();
        });

        it('acepta precio 0', () => {
            const out = crearProductoSchema.parse({ ...validBase, precio: 0 });
            expect(out.precio).toBe(0);
        });

        it('acepta imagen_url null', () => {
            const out = crearProductoSchema.parse({ ...validBase, imagen_url: null });
            expect(out.imagen_url).toBeNull();
        });
    });

    describe('actualizarProductoSchema', () => {
        it('rechaza objeto vacío', () => {
            expect(() => actualizarProductoSchema.parse({})).toThrow();
        });

        it('acepta parche de un solo campo', () => {
            const out = actualizarProductoSchema.parse({ nombre: 'Solo nombre' });
            expect(out.nombre).toBe('Solo nombre');
        });

        it('rechaza stock negativo en actualización', () => {
            expect(() => actualizarProductoSchema.parse({ stock: -1 })).toThrow();
        });
    });

    describe('listadoProductosQuerySchema', () => {
        it('aplica defaults de paginación y orden', () => {
            const out = listadoProductosQuerySchema.parse({});
            expect(out.page).toBe(1);
            expect(out.limit).toBe(20);
            expect(out.ordenar).toBe('orden_asc');
        });

        it('parsea filtros booleanos desde query string', () => {
            const out = listadoProductosQuerySchema.parse({
                activo: 'true',
                destacado: 'false',
                disponible: '1',
            });
            expect(out.activo).toBe(true);
            expect(out.destacado).toBe(false);
            expect(out.disponible).toBe(true);
        });

        it('interpreta all en destacado como sin filtro', () => {
            const out = listadoProductosQuerySchema.parse({ destacado: 'all' });
            expect(out.destacado).toBeUndefined();
        });

        it('corrige page inválida o negativa a 1', () => {
            expect(listadoProductosQuerySchema.parse({ page: '-3' }).page).toBe(1);
            expect(listadoProductosQuerySchema.parse({ page: '0' }).page).toBe(1);
            expect(listadoProductosQuerySchema.parse({ page: 'nope' }).page).toBe(1);
        });

        it('corrige limit inválido con fallback y tope 100', () => {
            expect(listadoProductosQuerySchema.parse({ limit: '0' }).limit).toBe(1);
            expect(listadoProductosQuerySchema.parse({ limit: 'x' }).limit).toBe(20);
            expect(listadoProductosQuerySchema.parse({ limit: '500' }).limit).toBe(100);
        });

        it('normaliza ordenar desconocido a orden_asc', () => {
            expect(listadoProductosQuerySchema.parse({ ordenar: 'sql_injection' }).ordenar).toBe('orden_asc');
        });
    });

    describe('productoIdParamSchema', () => {
        it('transforma id string a número', () => {
            const out = productoIdParamSchema.parse({ id: '42' });
            expect(out.id).toBe(42);
        });

        it('rechaza id no numérico', () => {
            expect(() => productoIdParamSchema.parse({ id: 'x' })).toThrow();
        });
    });
});
