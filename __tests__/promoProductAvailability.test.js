const { computePromoAvailabilityFromComponents } = require('../utils/promoProductAvailability');

describe('computePromoAvailabilityFromComponents', () => {
    it('devuelve 0 y no disponible sin componentes', () => {
        expect(computePromoAvailabilityFromComponents([])).toEqual({
            maxVendible: 0,
            disponibleParaVenta: false,
        });
    });

    it('calcula el mínimo de floor(stock/cantidad)', () => {
        expect(
            computePromoAvailabilityFromComponents([
                { stock: 10, cantidad: 3 },
                { stock: 5, cantidad: 2 },
            ]),
        ).toEqual({ maxVendible: 2, disponibleParaVenta: true });
    });

    it('no disponible si algún componente no alcanza', () => {
        expect(
            computePromoAvailabilityFromComponents([
                { stock: 0, cantidad: 1 },
                { stock: 99, cantidad: 1 },
            ]),
        ).toEqual({ maxVendible: 0, disponibleParaVenta: false });
    });

    it('combo 1+1: el cuello de botella define combos (ej. 10 y 3 → 3)', () => {
        expect(
            computePromoAvailabilityFromComponents([
                { stock: 10, cantidad: 1 },
                { stock: 3, cantidad: 1 },
            ]),
        ).toEqual({ maxVendible: 3, disponibleParaVenta: true });
    });
});
