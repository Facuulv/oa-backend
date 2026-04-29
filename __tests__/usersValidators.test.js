const {
    createUserSchema,
    updateUserSchema,
    changePasswordSchema,
    listUsuariosQuerySchema,
} = require('../validators/usersValidators');

describe('usersValidators', () => {
    const validCreate = {
        nombre: 'Ana',
        apellido: 'García',
        email: 'ana@example.com',
        password: 'secret12',
        rol: 'ADMIN',
    };

    it('createUserSchema exige rol de staff', () => {
        expect(() => createUserSchema.parse({ ...validCreate, rol: 'CLIENTE' })).toThrow();
    });

    it('createUserSchema acepta ENCARGADO y dni opcional', () => {
        const out = createUserSchema.parse({
            ...validCreate,
            rol: 'ENCARGADO',
            dni: ' 30123456 ',
            telefono: null,
        });
        expect(out.rol).toBe('ENCARGADO');
        expect(out.dni).toBe('30123456');
    });

    it('createUserSchema normaliza dni vacío a null', () => {
        const out = createUserSchema.parse({ ...validCreate, dni: '' });
        expect(out.dni).toBeNull();
    });

    it('updateUserSchema rechaza objeto vacío', () => {
        expect(() => updateUserSchema.parse({})).toThrow();
    });

    it('changePasswordSchema valida longitud mínima', () => {
        expect(() => changePasswordSchema.parse({ password: 'short' })).toThrow();
    });

    it('listUsuariosQuerySchema acepta filtros de query', () => {
        const out = listUsuariosQuerySchema.parse({ q: 'facu', rol: 'VENDEDOR', activo: '1', page: '2' });
        expect(out.q).toBe('facu');
        expect(out.rol).toBe('VENDEDOR');
        expect(out.activo).toBe('1');
        expect(out.page).toBe(2);
    });
});
