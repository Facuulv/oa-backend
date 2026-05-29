const { normalizeWhatsappPedidos } = require('../utils/whatsappPedidos');

describe('normalizeWhatsappPedidos', () => {
    test('acepta número con símbolos y normaliza a dígitos', () => {
        const r = normalizeWhatsappPedidos('+54 9 351 123-4567');
        expect(r.ok).toBe(true);
        expect(r.value).toBe('5493511234567');
    });

    test('rechaza número corto', () => {
        const r = normalizeWhatsappPedidos('549351');
        expect(r.ok).toBe(false);
    });

    test('rechaza vacío', () => {
        const r = normalizeWhatsappPedidos('   ');
        expect(r.ok).toBe(false);
    });
});
