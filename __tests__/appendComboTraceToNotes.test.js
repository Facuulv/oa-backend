const {
    buildOrderObservaciones,
    sanitizeComboLabels,
    formatComboTraceLine,
    ORDER_OBSERVATIONS_MAX_LENGTH,
} = require('../utils/appendComboTraceToNotes');
const { createOrderSchema } = require('../validators/ordersValidators');

describe('appendComboTraceToNotes', () => {
    it('sin comboLabels devuelve solo notas del cliente', () => {
        expect(buildOrderObservaciones('  Entregar tarde  ', undefined)).toBe('Entregar tarde');
        expect(buildOrderObservaciones(null, [])).toBeNull();
    });

    it('un combo agrega línea Combo personalizado', () => {
        expect(buildOrderObservaciones(null, ['Combo Fernet + Coca'])).toBe(
            'Combo personalizado: Combo Fernet + Coca',
        );
    });

    it('varios combos usan Combos personalizados plural', () => {
        expect(buildOrderObservaciones('Nota', ['Combo 1', 'Combo 2'])).toBe(
            'Nota\nCombos personalizados: Combo 1, Combo 2',
        );
    });

    it('deduplica labels y respeta max length total', () => {
        const longBase = 'x'.repeat(ORDER_OBSERVATIONS_MAX_LENGTH - 5);
        const out = buildOrderObservaciones(longBase, ['Mi Combo']);
        expect(out.length).toBeLessThanOrEqual(ORDER_OBSERVATIONS_MAX_LENGTH);
        expect(out.startsWith(longBase.slice(0, 490))).toBe(true);
    });

    it('trunca línea de combo si no entra con notas largas', () => {
        const base = 'a'.repeat(480);
        const out = buildOrderObservaciones(base, ['Nombre muy largo del combo']);
        expect(out.length).toBe(ORDER_OBSERVATIONS_MAX_LENGTH);
        expect(out.startsWith(base)).toBe(true);
        expect(out).toMatch(/Combo personalizad/);
    });
});

describe('sanitizeComboLabels / formatComboTraceLine', () => {
    it('ignora vacíos y duplicados', () => {
        expect(sanitizeComboLabels([' A ', '', 'A', 'B'])).toEqual(['A', 'B']);
    });

    it('formatComboTraceLine null sin labels', () => {
        expect(formatComboTraceLine([])).toBeNull();
    });
});

describe('createOrderSchema comboLabels', () => {
    const base = {
        customerName: 'Test',
        customerEmail: 't@e.com',
        items: [{ productId: 1, quantity: 1, unitPrice: 10 }],
    };

    it('acepta comboLabels opcional', () => {
        const out = createOrderSchema.parse({ ...base, comboLabels: ['Mi combo'] });
        expect(out.comboLabels).toEqual(['Mi combo']);
    });

    it('rechaza comboLabels vacío en array', () => {
        expect(() => createOrderSchema.parse({ ...base, comboLabels: [''] })).toThrow();
    });
});
