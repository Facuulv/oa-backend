/** @jest-environment node */

describe('fileStorage.resolvePublicIdFromUrl', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
        process.env.FILES_BASE_URL = 'https://files.oabebidas.com';
        process.env.FILES_UPLOAD_PATH = '/opt/files';
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('extrae el nombre de archivo de una URL del file server', () => {
        const { resolvePublicIdFromUrl } = require('../config/fileStorage');
        expect(resolvePublicIdFromUrl('https://files.oabebidas.com/abc-123.jpg')).toBe('abc-123.jpg');
    });

    it('ignora URLs de Cloudinary', () => {
        const { resolvePublicIdFromUrl } = require('../config/fileStorage');
        expect(
            resolvePublicIdFromUrl(
                'https://res.cloudinary.com/demo/image/upload/v1/sample.jpg',
            ),
        ).toBeNull();
    });

    it('acepta http localhost en development', () => {
        process.env.NODE_ENV = 'development';
        process.env.FILES_BASE_URL = 'http://localhost:3001/files';
        const { resolvePublicIdFromUrl } = require('../config/fileStorage');
        expect(resolvePublicIdFromUrl('http://localhost:3001/files/abc-123.jpg')).toBe('abc-123.jpg');
    });
});
