const { applyDiscount } = require('./pricing');

/** Valores permitidos en `pedidos.tipo_entrega` (ENUM en BD). */
const ALLOWED_TIPO_ENTREGA = ['DELIVERY', 'RETIRO'];

/**
 * @typedef {{ type: string, value: number }} PromotionDiscountShape
 */

/**
 * @param {number} subtotal
 * @param {PromotionDiscountShape} promotion
 * @param {number} [montoMinimo=0]
 */
function computeDiscountAmount(subtotal, promotion, montoMinimo = 0) {
    if (montoMinimo > 0 && subtotal < montoMinimo) {
        return { ok: false, code: 'MIN_PURCHASE_NOT_MET', amount: 0 };
    }
    const { amount } = applyDiscount(subtotal, {
        type: promotion.type,
        value: Number(promotion.value) || 0,
    });
    return { ok: true, amount };
}

function normalizeTextKey(s) {
    return String(s ?? '')
        .trim()
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Normaliza variantes de checkout/API al ENUM de BD: DELIVERY | RETIRO.
 * @param {unknown} raw
 * @returns {'DELIVERY'|'RETIRO'|null}
 */
function normalizeTipoEntrega(raw) {
    const key = normalizeTextKey(raw);
    if (!key) return null;
    if (key === 'DELIVERY' || key === 'ENVIO' || key === 'DOMICILIO' || key === 'DELIVERY_TYPE') {
        return 'DELIVERY';
    }
    if (key === 'RETIRO' || key === 'PICKUP' || key === 'LOCAL') {
        return 'RETIRO';
    }
    return null;
}

function devTipoEntregaLog(message, extra) {
    if (process.env.NODE_ENV !== 'development' && process.env.OA_DEBUG_ORDERS !== '1') {
        return;
    }
    if (extra !== undefined) {
        console.info(`[orders:tipo_entrega] ${message}`, extra);
        return;
    }
    console.info(`[orders:tipo_entrega] ${message}`);
}

/**
 * Resuelve tipo_entrega para INSERT en pedidos.
 * Prioridad: tipoEntrega explícito → dirección con delivery → fallback RETIRO.
 * @param {object} body — req.validatedData
 */
function resolveTipoEntrega(body) {
    const received = body.tipoEntrega ?? body.tipo_entrega ?? body.deliveryType ?? null;
    devTipoEntregaLog('recibido', { received, allowed: ALLOWED_TIPO_ENTREGA });

    let normalized = normalizeTipoEntrega(received);

    if (!normalized && body.deliveryAddress && String(body.deliveryAddress).trim()) {
        normalized = 'DELIVERY';
        devTipoEntregaLog('inferido por deliveryAddress', normalized);
    }

    if (!normalized) {
        normalized = 'RETIRO';
        devTipoEntregaLog('fallback', normalized);
    }

    devTipoEntregaLog('normalizado', normalized);
    return normalized;
}

function resolveCanalOrigen(body) {
    return body.canalOrigen && String(body.canalOrigen).trim() ? String(body.canalOrigen).trim() : 'WEB';
}

module.exports = {
    ALLOWED_TIPO_ENTREGA,
    computeDiscountAmount,
    normalizeTipoEntrega,
    resolveTipoEntrega,
    resolveCanalOrigen,
};
