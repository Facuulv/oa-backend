const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');
const { AppError } = require('../middlewares/errorHandler');
const { ROLES } = require('../config/constants');

const assertSoleActiveAdminGuards = async (target, updates) => {
    const wantsDeactivate = updates.activo === false;
    const wantsNonAdminRole = updates.rol !== undefined && updates.rol !== ROLES.ADMIN;

    if (!wantsDeactivate && !wantsNonAdminRole) {
        return;
    }

    const isTargetActiveAdmin = target.rol === ROLES.ADMIN && target.activo === true;
    if (!isTargetActiveAdmin) {
        return;
    }

    const activeAdmins = await userRepository.countActiveAdmins();
    if (activeAdmins !== 1) {
        return;
    }

    if (wantsDeactivate) {
        throw new AppError(
            'No se puede desactivar al único usuario administrador activo',
            409,
            'LAST_ACTIVE_ADMIN_DEACTIVATE',
        );
    }
    if (wantsNonAdminRole) {
        throw new AppError(
            'No se puede cambiar el rol del único usuario administrador activo',
            409,
            'LAST_ACTIVE_ADMIN_ROLE',
        );
    }
};

const assertSelfDeactivate = (actorId, targetId, updates) => {
    if (updates.activo === false && Number(actorId) === Number(targetId)) {
        throw new AppError('No puede desactivar su propia cuenta', 403, 'SELF_DEACTIVATE_FORBIDDEN');
    }
};

const list = async (query) => userRepository.listUsuarios(query);

const getById = async (id) => {
    const u = await userRepository.findByIdAdmin(id);
    if (!u) {
        throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
    }
    return u;
};

const create = async (data) => {
    const { nombre, apellido, dni, email, telefono, rol, password } = data;

    const existsEmail = await userRepository.emailExists(email);
    if (existsEmail) {
        throw new AppError('El email ya está registrado', 409, 'EMAIL_EXISTS');
    }

    if (dni) {
        const dniTaken = await userRepository.dniExists(dni);
        if (dniTaken) {
            throw new AppError('El DNI ya está registrado', 409, 'DNI_EXISTS');
        }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = await userRepository.insertUser({
        nombre,
        apellido,
        dni: dni ?? null,
        email,
        telefono: telefono ?? null,
        passwordHash,
        rol,
        activo: true,
    });

    return getById(id);
};

const update = async (actorId, id, fields) => {
    if (Object.keys(fields).length === 0) {
        throw new AppError('No hay campos para actualizar', 400, 'NO_FIELDS');
    }

    const existing = await userRepository.findByIdAdmin(id);
    if (!existing) {
        throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
    }

    assertSelfDeactivate(actorId, id, fields);
    await assertSoleActiveAdminGuards(existing, fields);

    if (fields.email !== undefined) {
        const taken = await userRepository.emailExistsExcluding(fields.email, id);
        if (taken) {
            throw new AppError('El email ya está registrado', 409, 'EMAIL_EXISTS');
        }
    }

    if (fields.dni !== undefined) {
        const dniVal = fields.dni;
        if (dniVal !== null && dniVal !== undefined && String(dniVal).trim() !== '') {
            const taken = await userRepository.dniExistsExcluding(String(dniVal).trim(), id);
            if (taken) {
                throw new AppError('El DNI ya está registrado', 409, 'DNI_EXISTS');
            }
        }
    }

    const affected = await userRepository.updateUsuario(id, fields);
    if (!affected) {
        throw new AppError('No hay campos válidos para actualizar', 400, 'NO_FIELDS');
    }

    return getById(id);
};

const changePassword = async (id, password) => {
    const existing = await userRepository.findByIdAdmin(id);
    if (!existing) {
        throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await userRepository.updatePasswordHash(id, passwordHash);
    return getById(id);
};

const deactivate = async (actorId, id) => {
    return update(actorId, id, { activo: false });
};

module.exports = {
    list,
    getById,
    create,
    update,
    changePassword,
    deactivate,
};
