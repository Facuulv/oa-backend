const userRepository = require('../repositories/userRepository');
const adminUsuariosService = require('../services/adminUsuariosService');

jest.mock('../repositories/userRepository');

describe('adminUsuariosService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('update bloquea editar la propia cuenta desde gestión de usuarios', async () => {
        await expect(adminUsuariosService.update(1, 1, { activo: false })).rejects.toMatchObject({
            statusCode: 403,
            code: 'SELF_EDIT_USE_PROFILE',
        });
        expect(userRepository.findByIdAdmin).not.toHaveBeenCalled();
        expect(userRepository.updateUsuario).not.toHaveBeenCalled();
    });

    it('changePassword bloquea cambiar la propia contraseña desde gestión de usuarios', async () => {
        await expect(adminUsuariosService.changePassword(1, 1, 'newpass1')).rejects.toMatchObject({
            statusCode: 403,
            code: 'SELF_PASSWORD_USE_PROFILE',
        });
        expect(userRepository.findByIdAdmin).not.toHaveBeenCalled();
    });

    it('update impide desactivar al único admin activo', async () => {
        userRepository.findByIdAdmin.mockResolvedValue({
            id: 2,
            rol: 'ADMIN',
            activo: true,
            nombre: 'A',
            apellido: 'B',
            email: 'admin@x.com',
            dni: null,
            telefono: null,
            fecha_creacion: new Date(),
            fecha_modificacion: null,
        });
        userRepository.countActiveAdmins.mockResolvedValue(1);

        await expect(adminUsuariosService.update(9, 2, { activo: false })).rejects.toMatchObject({
            statusCode: 409,
            code: 'LAST_ACTIVE_ADMIN_DEACTIVATE',
        });
    });

    it('update impide quitar rol ADMIN al único admin activo', async () => {
        userRepository.findByIdAdmin.mockResolvedValue({
            id: 2,
            rol: 'ADMIN',
            activo: true,
            nombre: 'A',
            apellido: 'B',
            email: 'admin@x.com',
            dni: null,
            telefono: null,
            fecha_creacion: new Date(),
            fecha_modificacion: null,
        });
        userRepository.countActiveAdmins.mockResolvedValue(1);

        await expect(adminUsuariosService.update(9, 2, { rol: 'VENDEDOR' })).rejects.toMatchObject({
            statusCode: 409,
            code: 'LAST_ACTIVE_ADMIN_ROLE',
        });
    });

    it('update persiste cuando hay otro admin activo', async () => {
        userRepository.findByIdAdmin
            .mockResolvedValueOnce({
                id: 2,
                rol: 'ADMIN',
                activo: true,
                nombre: 'A',
                apellido: 'B',
                email: 'admin@x.com',
                dni: null,
                telefono: null,
                fecha_creacion: new Date(),
                fecha_modificacion: null,
            })
            .mockResolvedValueOnce({
                id: 2,
                rol: 'VENDEDOR',
                activo: true,
                nombre: 'A',
                apellido: 'B',
                email: 'admin@x.com',
                dni: null,
                telefono: null,
                fecha_creacion: new Date(),
                fecha_modificacion: new Date(),
            });
        userRepository.countActiveAdmins.mockResolvedValue(2);
        userRepository.updateUsuario.mockResolvedValue(1);

        const out = await adminUsuariosService.update(9, 2, { rol: 'VENDEDOR' });
        expect(out.rol).toBe('VENDEDOR');
        expect(userRepository.updateUsuario).toHaveBeenCalled();
    });
});
