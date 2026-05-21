const { AppError } = require('../middlewares/errorHandler');

/** Tolerancia en pesos para log de diferencia cliente vs BD (no falla el pedido). */
const CLIENT_PRICE_MISMATCH_LOG_TOLERANCE = 0.01;

const shouldDebugPricing = () =>
    process.env.NODE_ENV !== 'production' || process.env.OA_DEBUG_ORDERS === '1';

/**
 * Redondea a 2 decimales (DECIMAL(10,2) en pedidos).
 * @param {number} value
 * @returns {number}
 */
const roundMoney = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) {
        throw new AppError('Importe inválido en cálculo de precios', 500, 'INVALID_ORDER_AMOUNT');
    }
    return Math.round(n * 100) / 100;
};

/**
 * @param {{ precio: unknown }} productRow
 * @returns {number}
 */
const unitPriceFromProductRow = (productRow) => {
    const price = Number(productRow.precio);
    if (!Number.isFinite(price) || price <= 0) {
        throw new AppError('Precio de producto inválido en catálogo', 400, 'INVALID_PRODUCT_PRICE');
    }
    return roundMoney(price);
};

/**
 * Construye líneas de pedido con precios de autoridad desde BD.
 * Espera ítems ya fusionados por productId (mergeOrderItemsByProductId): una entrada por producto.
 * `items[].unitPrice` del cliente se usa solo para log opcional en desarrollo.
 *
 * @param {Array<{ productId: number, quantity: number, unitPrice: number, notes?: string|null }>} items
 * @param {Map<number, { id: number, nombre: string, precio: unknown }>} productMap
 * @returns {{
 *   lines: Array<{
 *     productId: number,
 *     quantity: number,
 *     unitPrice: number,
 *     lineSubtotal: number,
 *     productName: string,
 *     notes: string|null,
 *   }>,
 *   orderSubtotal: number,
 * }}
 */
function buildOrderPricing(items, productMap) {
    const lines = [];
    let orderSubtotal = 0;
    const debug = shouldDebugPricing();

    for (const item of items) {
        const prod = productMap.get(item.productId);
        if (!prod) {
            throw new AppError('Producto no encontrado', 400, 'INVALID_PRODUCT');
        }

        const unitPrice = unitPriceFromProductRow(prod);
        const lineSubtotal = roundMoney(unitPrice * item.quantity);
        orderSubtotal = roundMoney(orderSubtotal + lineSubtotal);

        if (debug && item.unitPrice != null && Number.isFinite(Number(item.unitPrice))) {
            const clientPrice = roundMoney(item.unitPrice);
            if (Math.abs(clientPrice - unitPrice) > CLIENT_PRICE_MISMATCH_LOG_TOLERANCE) {
                console.info('[orders:pricing] precio cliente distinto al catálogo', {
                    productId: item.productId,
                    clientUnitPrice: clientPrice,
                    catalogUnitPrice: unitPrice,
                });
            }
        }

        lines.push({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice,
            lineSubtotal,
            productName: prod.nombre,
            notes: item.notes ?? null,
        });
    }

    return { lines, orderSubtotal };
}

module.exports = {
    roundMoney,
    unitPriceFromProductRow,
    buildOrderPricing,
    CLIENT_PRICE_MISMATCH_LOG_TOLERANCE,
};
