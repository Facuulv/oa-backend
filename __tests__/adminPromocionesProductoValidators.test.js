const {

    crearPromocionProductoSchema,

    actualizarPromocionProductoSchema,

    componentePromoSchema,

} = require('../validators/adminPromocionesProductoValidators');



describe('adminPromocionesProductoValidators', () => {

    describe('crearPromocionProductoSchema', () => {

        const base = {

            categoria_id: 1,

            nombre: 'Combo test',

            precio: 100,

            destacado: false,

            disponible: true,

            activo: true,

            orden: 0,

        };



        it('rechaza sin componentes', () => {

            expect(() => crearPromocionProductoSchema.parse({ ...base, componentes: [] })).toThrow();

        });



        it('acepta combo mínimo con producto_hijo_id', () => {

            const out = crearPromocionProductoSchema.parse({

                ...base,

                componentes: [{ producto_hijo_id: 5, cantidad: 2 }],

            });

            expect(out.componentes).toEqual([{ producto_hijo_id: 5, cantidad: 2 }]);

        });

    });



    describe('actualizarPromocionProductoSchema', () => {

        it('rechaza componentes vacíos si se envía el arreglo', () => {

            expect(() =>

                actualizarPromocionProductoSchema.parse({

                    componentes: [],

                }),

            ).toThrow();

        });



        it('acepta parche solo de nombre', () => {

            const out = actualizarPromocionProductoSchema.parse({ nombre: 'Nuevo' });

            expect(out.nombre).toBe('Nuevo');

        });

    });



    describe('componentePromoSchema', () => {

        it('rechaza cantidad cero', () => {

            expect(() => componentePromoSchema.parse({ producto_hijo_id: 1, cantidad: 0 })).toThrow();

        });

    });

});


