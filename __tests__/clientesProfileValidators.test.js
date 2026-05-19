const {
    clienteDniSchema,
    updateClienteProfileSchema,
} = require('../validators/clientesProfileValidators');
const { registerSchema } = require('../validators/authValidators');

describe('clientesProfileValidators', () => {
    it('clienteDniSchema acepta DNI de 7 a 10 dígitos', () => {
        expect(clienteDniSchema.parse('3012345')).toBe('3012345');
        expect(clienteDniSchema.parse('3012345678')).toBe('3012345678');
    });

    it('clienteDniSchema rechaza letras', () => {
        expect(() => clienteDniSchema.parse('30abc456')).toThrow();
    });

    it('registerSchema exige dni', () => {
        expect(() =>
            registerSchema.parse({
                nombre: 'Juan',
                apellido: 'Pérez',
                email: 'j@mail.com',
                password: 'secret12',
            }),
        ).toThrow();
    });

    it('registerSchema acepta registro con dni', () => {
        const out = registerSchema.parse({
            nombre: 'Juan',
            apellido: 'Pérez',
            dni: '30123456',
            email: 'j@mail.com',
            password: 'secret12',
        });
        expect(out.dni).toBe('30123456');
    });

    it('updateClienteProfileSchema rechaza email en body', () => {
        expect(() =>
            updateClienteProfileSchema.parse({
                nombre: 'Juan',
                email: 'otro@mail.com',
            }),
        ).toThrow();
    });

    it('updateClienteProfileSchema rechaza objeto vacío', () => {
        expect(() => updateClienteProfileSchema.parse({})).toThrow();
    });

    it('updateClienteProfileSchema acepta telefono y fecha', () => {
        const out = updateClienteProfileSchema.parse({
            telefono: '3515551234',
            fecha_nacimiento: '1990-05-15',
        });
        expect(out.telefono).toBe('3515551234');
    });
});
