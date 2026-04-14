const { applyDiscount } = require('./pricing');

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

function resolveTipoEntrega(body) {
    if (body.tipoEntrega) return body.tipoEntrega;
    if (body.paymentMethod === 'CASH') return 'RETIRO';
    if (body.paymentMethod === 'TRANSFER') return 'ENVIO';
    return 'RETIRO';
}

function resolveCanalOrigen(body) {
    return body.canalOrigen && String(body.canalOrigen).trim() ? String(body.canalOrigen).trim() : 'WEB';
}

module.exports = {
    computeDiscountAmount,
    resolveTipoEntrega,
    resolveCanalOrigen,
};
