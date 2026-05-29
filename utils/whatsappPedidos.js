/**
 * Normaliza número de WhatsApp para pedidos (solo dígitos, formato AR móvil).
 * Ejemplo válido: 5493511234567
 */
const normalizeWhatsappPedidos = (input) => {
    const digits = String(input ?? '').replace(/\D/g, '');
    if (!digits) return { ok: false, error: 'El número de WhatsApp es obligatorio' };

    if (!/^549\d{8,10}$/.test(digits)) {
        return {
            ok: false,
            error: 'Formato inválido. Usá solo dígitos, por ejemplo 5493511234567 (código país 54 + 9 + área + número).',
        };
    }

    return { ok: true, value: digits };
};

module.exports = {
    normalizeWhatsappPedidos,
};
