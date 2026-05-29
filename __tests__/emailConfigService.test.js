const {
    DEFAULTS,
    stripHtmlTags,
    sanitizePlain,
    buildFromHeader,
    buildResetEmailContent,
    invalidateCache,
} = require('../services/emailConfigService');

describe('emailConfigService', () => {
    const originalFrom = process.env.SMTP_FROM;

    beforeEach(() => {
        invalidateCache();
        process.env.SMTP_FROM = 'noreply@oa.com';
    });

    afterEach(() => {
        invalidateCache();
        if (originalFrom === undefined) delete process.env.SMTP_FROM;
        else process.env.SMTP_FROM = originalFrom;
    });

    test('stripHtmlTags elimina etiquetas HTML', () => {
        expect(stripHtmlTags('<b>OA!</b>')).toBe('OA!');
        expect(stripHtmlTags('<script>alert(1)</script>Hola')).toBe('Hola');
    });

    test('buildFromHeader usa SMTP_FROM y nombre visible', () => {
        expect(buildFromHeader('OA! Bebidas')).toBe('"OA! Bebidas" <noreply@oa.com>');
    });

    test('buildFromHeader escapa comillas en el nombre', () => {
        expect(buildFromHeader('OA "Test"')).toBe('"OA \\"Test\\"" <noreply@oa.com>');
    });

    test('buildResetEmailContent usa asunto e intro por defecto si no hay BD', async () => {
        const content = await buildResetEmailContent({
            nombre: 'Facu',
            resetUrl: 'https://example.com/reset?token=abc',
        });
        expect(content.subject).toBe(DEFAULTS.asunto);
        expect(content.from).toContain('noreply@oa.com');
        expect(content.text).toContain('Facu');
        expect(content.text).toContain(DEFAULTS.textoIntro);
        expect(content.html).not.toContain('<script>');
    });
});
