const { createOrderSchema } = require('../validators/ordersValidators');
const { MAX_ITEMS_PER_ORDER, MAX_QUANTITY_PER_LINE } = require('../services/normalizeOrderItems');

const baseOrder = {
    customerName: 'Test User',
    customerEmail: 'test@example.com',
    items: [{ productId: 1, quantity: 1, unitPrice: 100 }],
};

describe('createOrderSchema', () => {
    it('acepta pedido mínimo válido', () => {
        const out = createOrderSchema.parse(baseOrder);
        expect(out.items).toHaveLength(1);
        expect(out.items[0].productId).toBe(1);
    });

    it('rechaza items vacío', () => {
        expect(() => createOrderSchema.parse({ ...baseOrder, items: [] })).toThrow();
    });

    it('rechaza más de MAX_ITEMS_PER_ORDER líneas', () => {
        const items = Array.from({ length: MAX_ITEMS_PER_ORDER + 1 }, (_, i) => ({
            productId: i + 1,
            quantity: 1,
            unitPrice: 10,
        }));
        expect(() => createOrderSchema.parse({ ...baseOrder, items })).toThrow();
    });

    it('rechaza quantity por encima del máximo', () => {
        expect(() =>
            createOrderSchema.parse({
                ...baseOrder,
                items: [{ productId: 1, quantity: MAX_QUANTITY_PER_LINE + 1, unitPrice: 10 }],
            }),
        ).toThrow();
    });

    it('rechaza productId no entero (string)', () => {
        expect(() =>
            createOrderSchema.parse({
                ...baseOrder,
                items: [{ productId: 'combo-personalizado-1', quantity: 1, unitPrice: 10 }],
            }),
        ).toThrow();
    });

    it('rechaza productId cero o negativo', () => {
        expect(() =>
            createOrderSchema.parse({
                ...baseOrder,
                items: [{ productId: 0, quantity: 1, unitPrice: 10 }],
            }),
        ).toThrow();
    });

    it('rechaza unitPrice no finito', () => {
        expect(() =>
            createOrderSchema.parse({
                ...baseOrder,
                items: [{ productId: 1, quantity: 1, unitPrice: Number.NaN }],
            }),
        ).toThrow();
        expect(() =>
            createOrderSchema.parse({
                ...baseOrder,
                items: [{ productId: 1, quantity: 1, unitPrice: Number.POSITIVE_INFINITY }],
            }),
        ).toThrow();
    });

    it('rechaza unitPrice cero o negativo', () => {
        expect(() =>
            createOrderSchema.parse({
                ...baseOrder,
                items: [{ productId: 1, quantity: 1, unitPrice: 0 }],
            }),
        ).toThrow();
    });

    it('acepta pedido sin comboLabels', () => {
        const out = createOrderSchema.parse(baseOrder);
        expect(out.comboLabels).toBeUndefined();
    });
});
