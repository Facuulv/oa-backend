const { AppError } = require('../middlewares/errorHandler');

/** Máximo de líneas en `items` por pedido (POST /public/orders). */
const MAX_ITEMS_PER_ORDER = 100;

/** Máximo de unidades por línea (también por productId tras fusionar). */
const MAX_QUANTITY_PER_LINE = 99;

/** Límite de `pedidos_detalle.observaciones`. */
const LINE_NOTES_MAX_LENGTH = 255;

const LINE_NOTES_MERGE_SEPARATOR = ' | ';

const isPositiveFiniteInt = (value) => {
    const n = Math.trunc(Number(value));
    return Number.isFinite(n) && n === Number(value) && n > 0;
};

const isPositiveFiniteNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0;
};

/**
 * Sanitiza y valida líneas de pedido ya parseadas por Zod (defensa en profundidad).
 * No recalcula precios (ver buildOrderPricing). Usar mergeOrderItemsByProductId antes de pricing/stock/detalle.
 * @param {Array<{ productId: number, quantity: number, unitPrice: number, notes?: string|null }>} items
 * @returns {Array<{ productId: number, quantity: number, unitPrice: number, notes: string|null }>}
 */
function normalizeOrderItems(items) {
    if (!Array.isArray(items) || items.length === 0) {
        throw new AppError('El pedido debe incluir al menos un producto', 400, 'ORDER_ITEMS_REQUIRED');
    }
    if (items.length > MAX_ITEMS_PER_ORDER) {
        throw new AppError(
            `El pedido no puede superar ${MAX_ITEMS_PER_ORDER} líneas`,
            400,
            'ORDER_ITEMS_LIMIT',
        );
    }

    return items.map((item, index) => {
        const line = index + 1;

        if (!isPositiveFiniteInt(item.productId)) {
            throw new AppError(
                `Línea ${line}: productId inválido`,
                400,
                'INVALID_ORDER_ITEM',
            );
        }

        const quantity = Math.trunc(Number(item.quantity));
        if (!isPositiveFiniteInt(item.quantity) || quantity > MAX_QUANTITY_PER_LINE) {
            throw new AppError(
                quantity > MAX_QUANTITY_PER_LINE
                    ? `Línea ${line}: cantidad máxima ${MAX_QUANTITY_PER_LINE}`
                    : `Línea ${line}: cantidad inválida`,
                400,
                quantity > MAX_QUANTITY_PER_LINE ? 'ORDER_QUANTITY_LIMIT' : 'INVALID_ORDER_ITEM',
            );
        }

        const unitPrice = Number(item.unitPrice);
        if (!isPositiveFiniteNumber(item.unitPrice)) {
            throw new AppError(`Línea ${line}: precio unitario inválido`, 400, 'INVALID_ORDER_ITEM');
        }

        let notes = null;
        if (item.notes != null && item.notes !== '') {
            const s = String(item.notes).trim();
            if (s.length > 255) {
                throw new AppError(`Línea ${line}: observaciones demasiado largas`, 400, 'INVALID_ORDER_ITEM');
            }
            notes = s || null;
        }

        return {
            productId: Math.trunc(Number(item.productId)),
            quantity,
            unitPrice,
            notes,
        };
    });
}

/**
 * Fusiona notas de líneas del mismo producto (máx. LINE_NOTES_MAX_LENGTH).
 * @param {string|null} existing
 * @param {string|null} next
 * @returns {string|null}
 */
function mergeLineNotes(existing, next) {
    if (!next) {
        return existing;
    }
    if (!existing) {
        return next;
    }
    if (existing === next) {
        return existing;
    }
    const combined = `${existing}${LINE_NOTES_MERGE_SEPARATOR}${next}`;
    if (combined.length <= LINE_NOTES_MAX_LENGTH) {
        return combined;
    }
    return combined.slice(0, LINE_NOTES_MAX_LENGTH);
}

/**
 * Agrupa líneas por productId: suma cantidades y fusiona notas.
 * El precio de venta lo define buildOrderPricing (BD); unitPrice del ítem se conserva solo del primero.
 *
 * @param {Array<{ productId: number, quantity: number, unitPrice: number, notes: string|null }>} items
 * @returns {Array<{ productId: number, quantity: number, unitPrice: number, notes: string|null }>}
 */
function mergeOrderItemsByProductId(items) {
    if (!Array.isArray(items) || items.length === 0) {
        return [];
    }

    const byProductId = new Map();

    for (const item of items) {
        const prev = byProductId.get(item.productId);
        if (!prev) {
            byProductId.set(item.productId, {
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                notes: item.notes,
            });
            continue;
        }

        prev.quantity += item.quantity;
        prev.notes = mergeLineNotes(prev.notes, item.notes);
    }

    const merged = [...byProductId.values()];
    for (const row of merged) {
        if (row.quantity > MAX_QUANTITY_PER_LINE) {
            throw new AppError(
                `La cantidad total del producto ${row.productId} no puede superar ${MAX_QUANTITY_PER_LINE}`,
                400,
                'ORDER_QUANTITY_LIMIT',
            );
        }
    }

    return merged;
}

/**
 * Comprueba que todos los productos solicitados existen, están activos y disponibles para venta.
 * @param {number[]} requestedIds — ids únicos del pedido
 * @param {Array<{ id: number, activo: number|boolean, disponible: number|boolean }>} productRows
 */
function assertProductsSellable(requestedIds, productRows) {
    const rowMap = new Map(productRows.map((r) => [r.id, r]));

    for (const id of requestedIds) {
        const row = rowMap.get(id);
        if (!row) {
            throw new AppError('Producto no encontrado', 400, 'INVALID_PRODUCT');
        }
        if (Number(row.activo) !== 1) {
            throw new AppError('Producto inválido o inactivo', 400, 'INVALID_PRODUCT');
        }
        if (Number(row.disponible) !== 1) {
            throw new AppError('Producto no disponible para la venta', 400, 'PRODUCT_NOT_AVAILABLE');
        }
    }
}

module.exports = {
    MAX_ITEMS_PER_ORDER,
    MAX_QUANTITY_PER_LINE,
    LINE_NOTES_MAX_LENGTH,
    normalizeOrderItems,
    mergeOrderItemsByProductId,
    mergeLineNotes,
    assertProductsSellable,
};
