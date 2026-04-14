const bcrypt = require('bcryptjs');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middlewares/errorHandler');
const userRepository = require('../repositories/userRepository');
const db = require('../config/database');

const PUBLIC_COLUMNS = 'id, nombre, apellido, email, telefono, rol, activo, fecha_creacion';

exports.list = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const [users] = await db.execute(
        `SELECT ${PUBLIC_COLUMNS} FROM usuarios ORDER BY id DESC LIMIT ? OFFSET ?`,
        [String(limit), String(offset)],
    );

    const [countResult] = await db.execute('SELECT COUNT(*) as total FROM usuarios');

    res.json({
        data: users,
        pagination: { page, limit, total: countResult[0].total },
    });
});

exports.getById = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;

    const [users] = await db.execute(`SELECT ${PUBLIC_COLUMNS} FROM usuarios WHERE id = ?`, [id]);

    if (users.length === 0) {
        throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
    }

    res.json({ data: users[0] });
});

exports.create = asyncHandler(async (req, res) => {
    const { nombre, apellido, email, password, rol, telefono } = req.validatedData;

    const exists = await userRepository.emailExists(email);
    if (exists) {
        throw new AppError('El email ya está registrado', 409, 'EMAIL_EXISTS');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = await userRepository.insertUser({
        nombre,
        apellido,
        email,
        telefono,
        passwordHash,
        rol,
    });

    res.status(201).json({
        data: { id, nombre, apellido, email, telefono: telefono || null, rol },
    });
});

exports.update = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    const fields = req.validatedData;

    if (Object.keys(fields).length === 0) {
        throw new AppError('No hay campos para actualizar', 400, 'NO_FIELDS');
    }

    const allowed = ['nombre', 'apellido', 'email', 'telefono', 'rol', 'activo'];
    const setClauses = [];
    const values = [];

    for (const key of allowed) {
        if (fields[key] !== undefined) {
            setClauses.push(`${key} = ?`);
            values.push(fields[key]);
        }
    }

    if (setClauses.length === 0) {
        throw new AppError('No hay campos válidos para actualizar', 400, 'NO_FIELDS');
    }

    setClauses.push('fecha_modificacion = CURRENT_TIMESTAMP');
    values.push(id);
    await db.execute(`UPDATE usuarios SET ${setClauses.join(', ')} WHERE id = ?`, values);

    res.json({ message: 'Usuario actualizado' });
});

exports.remove = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;

    await db.execute('UPDATE usuarios SET activo = 0, fecha_modificacion = CURRENT_TIMESTAMP WHERE id = ?', [
        id,
    ]);

    res.json({ message: 'Usuario desactivado' });
});
