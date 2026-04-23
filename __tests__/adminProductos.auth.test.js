const request = require('supertest');

describe('Admin productos — HTTP', () => {
    let app;

    beforeAll(() => {
        // eslint-disable-next-line global-require
        app = require('../server');
    });

    afterAll(async () => {
        try {
            // eslint-disable-next-line global-require
            await require('../config/database').end();
        } catch {
            // ignore
        }
    });

    it('GET /admin/productos sin sesión responde 401', async () => {
        const res = await request(app).get('/admin/productos').set('Accept', 'application/json');
        expect(res.status).toBe(401);
        expect(res.body.code).toBe('NO_SESSION');
    });

    it('POST /admin/productos sin sesión responde 401', async () => {
        const res = await request(app)
            .post('/admin/productos')
            .set('Accept', 'application/json')
            .send({ categoria_id: 1, nombre: 'X', precio: 1 });
        expect(res.status).toBe(401);
    });
});
