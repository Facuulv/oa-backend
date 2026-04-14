const { DEFAULT_TAX_RATE } = require('../config/constants');
const { calculateSubtotal, calculateTotal } = require('../utils/pricing');

/** Price breakdowns for carts and orders (tax from `DEFAULT_TAX_RATE` until settings-driven tax exists). */
class PricingService {
    calculate(items, discount = null) {
        const subtotal = calculateSubtotal(
            items.map((i) => ({ price: i.unitPrice, quantity: i.quantity })),
        );
        return calculateTotal(subtotal, discount, DEFAULT_TAX_RATE);
    }
}

module.exports = new PricingService();
