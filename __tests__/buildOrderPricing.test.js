const { buildOrderPricing, roundMoney } = require('../services/buildOrderPricing');
const { mergeOrderItemsByProductId } = require('../services/normalizeOrderItems');
const { computeDiscountAmount } = require('../utils/orderHelpers');

describe('buildOrderPricing', () => {
    const productMap = new Map([
        [1, { id: 1, nombre: 'Fernet', precio: '5000.00' }],
        [2, { id: 2, nombre: 'Coca', precio: 1500 }],
    ]);

    it('usa precio de BD aunque el cliente envíe unitPrice menor', () => {
        const { lines, orderSubtotal } = buildOrderPricing(
            [{ productId: 1, quantity: 2, unitPrice: 1, notes: null }],
            productMap,
        );
        expect(lines).toHaveLength(1);
        expect(lines[0].unitPrice).toBe(5000);
        expect(lines[0].lineSubtotal).toBe(10000);
        expect(lines[0].productName).toBe('Fernet');
        expect(orderSubtotal).toBe(10000);
    });

    it('con ítems fusionados genera una línea y subtotal cantidad total × precio BD', () => {
        const map = new Map([[3, { id: 3, nombre: 'Item', precio: '10.333' }]]);
        const merged = mergeOrderItemsByProductId([
            { productId: 3, quantity: 1, unitPrice: 99, notes: null },
            { productId: 3, quantity: 2, unitPrice: 99, notes: 'x' },
        ]);
        const { lines, orderSubtotal } = buildOrderPricing(merged, map);
        expect(lines).toHaveLength(1);
        expect(lines[0].quantity).toBe(3);
        expect(lines[0].unitPrice).toBe(10.33);
        expect(lines[0].lineSubtotal).toBe(30.99);
        expect(orderSubtotal).toBe(30.99);
    });

    it('suma múltiples productos distintos', () => {
        const { lines, orderSubtotal } = buildOrderPricing(
            [
                { productId: 1, quantity: 1, unitPrice: 1, notes: null },
                { productId: 2, quantity: 2, unitPrice: 1, notes: null },
            ],
            productMap,
        );
        expect(lines).toHaveLength(2);
        expect(orderSubtotal).toBe(8000);
    });

    it('rechaza precio de catálogo inválido', () => {
        const map = new Map([[9, { id: 9, nombre: 'Mal', precio: 0 }]]);
        expect(() =>
            buildOrderPricing([{ productId: 9, quantity: 1, unitPrice: 100, notes: null }], map),
        ).toThrow(expect.objectContaining({ code: 'INVALID_PRODUCT_PRICE' }));
    });
});

describe('cupón sobre subtotal BD', () => {
    it('descuento porcentual se aplica al subtotal calculado desde BD', () => {
        const productMap = new Map([[1, { id: 1, nombre: 'A', precio: 1000 }]]);
        const { orderSubtotal } = buildOrderPricing(
            [{ productId: 1, quantity: 1, unitPrice: 1, notes: null }],
            productMap,
        );
        expect(orderSubtotal).toBe(1000);

        const disc = computeDiscountAmount(orderSubtotal, { type: 'PERCENTAGE', value: 10 }, 0);
        expect(disc.ok).toBe(true);
        expect(disc.amount).toBe(100);
        expect(roundMoney(orderSubtotal - disc.amount)).toBe(900);
    });
});
