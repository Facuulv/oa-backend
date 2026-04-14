/**
 * Capa de pagos (sin proveedor configurado).
 * Implementar aquí preferencias / webhooks cuando exista un flujo real.
 */
class PaymentService {
    async createPreference() {
        throw new Error('PaymentService.createPreference is not implemented');
    }

    async handleWebhook() {
        throw new Error('PaymentService.handleWebhook is not implemented');
    }

    async getPaymentStatus() {
        throw new Error('PaymentService.getPaymentStatus is not implemented');
    }
}

module.exports = new PaymentService();
