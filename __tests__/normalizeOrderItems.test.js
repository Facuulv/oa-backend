const {
    normalizeOrderItems,
    mergeOrderItemsByProductId,
    mergeLineNotes,
    assertProductsSellable,
    MAX_ITEMS_PER_ORDER,
    MAX_QUANTITY_PER_LINE,
    LINE_NOTES_MAX_LENGTH,
} = require('../services/normalizeOrderItems');

describe('normalizeOrderItems', () => {
    it('normaliza línea válida', () => {
        const out = normalizeOrderItems([{ productId: 5, quantity: 2, unitPrice: 1500.5, notes: '  ok  ' }]);
        expect(out).toEqual([
            { productId: 5, quantity: 2, unitPrice: 1500.5, notes: 'ok' },
        ]);
    });

    it('rechaza array vacío', () => {
        expect(() => normalizeOrderItems([])).toThrow(
            expect.objectContaining({ code: 'ORDER_ITEMS_REQUIRED' }),
        );
    });

    it('rechaza demasiadas líneas', () => {
        const items = Array.from({ length: MAX_ITEMS_PER_ORDER + 1 }, () => ({
            productId: 1,
            quantity: 1,
            unitPrice: 1,
        }));
        expect(() => normalizeOrderItems(items)).toThrow(
            expect.objectContaining({ code: 'ORDER_ITEMS_LIMIT' }),
        );
    });

    it('rechaza quantity excesiva', () => {
        expect(() =>
            normalizeOrderItems([{ productId: 1, quantity: MAX_QUANTITY_PER_LINE + 1, unitPrice: 10 }]),
        ).toThrow(expect.objectContaining({ code: 'ORDER_QUANTITY_LIMIT' }));
    });

    it('rechaza productId no entero positivo', () => {
        expect(() => normalizeOrderItems([{ productId: 1.5, quantity: 1, unitPrice: 10 }])).toThrow(
            expect.objectContaining({ code: 'INVALID_ORDER_ITEM' }),
        );
    });

    it('rechaza unitPrice no finito', () => {
        expect(() => normalizeOrderItems([{ productId: 1, quantity: 1, unitPrice: NaN }])).toThrow(
            expect.objectContaining({ code: 'INVALID_ORDER_ITEM' }),
        );
    });
});

describe('mergeOrderItemsByProductId', () => {
    it('fusiona dos líneas del mismo productId sumando cantidad', () => {
        const merged = mergeOrderItemsByProductId([
            { productId: 5, quantity: 1, unitPrice: 10, notes: null },
            { productId: 5, quantity: 2, unitPrice: 99, notes: null },
        ]);
        expect(merged).toHaveLength(1);
        expect(merged[0]).toMatchObject({ productId: 5, quantity: 3, unitPrice: 10, notes: null });
    });

    it('mantiene una sola nota si es igual', () => {
        const merged = mergeOrderItemsByProductId([
            { productId: 1, quantity: 1, unitPrice: 1, notes: 'sin hielo' },
            { productId: 1, quantity: 1, unitPrice: 1, notes: 'sin hielo' },
        ]);
        expect(merged[0].notes).toBe('sin hielo');
    });

    it('concatena notas distintas con separador', () => {
        const merged = mergeOrderItemsByProductId([
            { productId: 1, quantity: 1, unitPrice: 1, notes: 'A' },
            { productId: 1, quantity: 1, unitPrice: 1, notes: 'B' },
        ]);
        expect(merged[0].notes).toBe('A | B');
    });

    it('rechaza cantidad fusionada mayor al máximo por producto', () => {
        expect(() =>
            mergeOrderItemsByProductId([
                { productId: 2, quantity: 50, unitPrice: 1, notes: null },
                { productId: 2, quantity: 50, unitPrice: 1, notes: null },
            ]),
        ).toThrow(expect.objectContaining({ code: 'ORDER_QUANTITY_LIMIT' }));
    });

    it('no fusiona productos distintos', () => {
        const merged = mergeOrderItemsByProductId([
            { productId: 1, quantity: 1, unitPrice: 1, notes: null },
            { productId: 2, quantity: 2, unitPrice: 1, notes: null },
        ]);
        expect(merged).toHaveLength(2);
    });
});

describe('mergeLineNotes', () => {
    it('trunca concatenación larga a LINE_NOTES_MAX_LENGTH', () => {
        const a = 'x'.repeat(200);
        const b = 'y'.repeat(100);
        const out = mergeLineNotes(a, b);
        expect(out.length).toBe(LINE_NOTES_MAX_LENGTH);
        expect(out.startsWith(a)).toBe(true);
    });
});

describe('assertProductsSellable', () => {
    const rows = [
        { id: 1, activo: 1, disponible: 1 },
        { id: 2, activo: 1, disponible: 0 },
        { id: 3, activo: 0, disponible: 1 },
    ];

    it('acepta producto activo y disponible', () => {
        expect(() => assertProductsSellable([1], rows)).not.toThrow();
    });

    it('rechaza producto no disponible', () => {
        expect(() => assertProductsSellable([2], rows)).toThrow(
            expect.objectContaining({ code: 'PRODUCT_NOT_AVAILABLE' }),
        );
    });

    it('rechaza producto inactivo', () => {
        expect(() => assertProductsSellable([3], rows)).toThrow(
            expect.objectContaining({ code: 'INVALID_PRODUCT' }),
        );
    });

    it('rechaza producto inexistente', () => {
        expect(() => assertProductsSellable([99], rows)).toThrow(
            expect.objectContaining({ code: 'INVALID_PRODUCT' }),
        );
    });
});
