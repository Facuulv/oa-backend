const { DEFAULT_TAX_RATE } = require('../config/constants');

function calculateSubtotal(items) {
    return items.reduce((sum, item) => {
        const unitPrice = Number(item.price) || 0;
        const qty = Number(item.quantity) || 0;
        return sum + unitPrice * qty;
    }, 0);
}

function applyDiscount(subtotal, discount) {
    if (!discount) return { amount: 0, subtotalAfterDiscount: subtotal };

    let amount = 0;
    if (discount.type === 'PERCENTAGE') {
        amount = subtotal * (discount.value / 100);
    } else if (discount.type === 'FIXED') {
        amount = Math.min(discount.value, subtotal);
    }

    return {
        amount: Math.round(amount * 100) / 100,
        subtotalAfterDiscount: Math.round((subtotal - amount) * 100) / 100,
    };
}

function calculateTax(amount, rate = DEFAULT_TAX_RATE) {
    return Math.round(amount * rate * 100) / 100;
}

function calculateTotal(subtotal, discount = null, taxRate = DEFAULT_TAX_RATE) {
    const { amount: discountAmount, subtotalAfterDiscount } = applyDiscount(subtotal, discount);
    const tax = calculateTax(subtotalAfterDiscount, taxRate);

    return {
        subtotal: Math.round(subtotal * 100) / 100,
        discount: discountAmount,
        taxableBase: subtotalAfterDiscount,
        tax,
        total: Math.round((subtotalAfterDiscount + tax) * 100) / 100,
    };
}

module.exports = { calculateSubtotal, applyDiscount, calculateTax, calculateTotal };
