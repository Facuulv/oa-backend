/** Outbound notifications (email, SMS, push). Implement per channel when needed. */
class NotificationService {
    async sendOrderConfirmation() {
        console.log('[oa-api] NotificationService.sendOrderConfirmation (stub)');
    }

    async sendStatusUpdate() {
        console.log('[oa-api] NotificationService.sendStatusUpdate (stub)');
    }
}

module.exports = new NotificationService();
