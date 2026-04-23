const db = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middlewares/errorHandler');

const PUBLIC_SELECT = `id,
        nombre AS name,
        descripcion AS description,
        imagen_url,
        orden AS sort_order,
        activo AS active,
        fecha_creacion AS created_at,
        fecha_modificacion AS updated_at`;

exports.list = asyncHandler(async (_req, res) => {
    const [categories] = await db.execute(
        `SELECT ${PUBLIC_SELECT} FROM categorias WHERE activo = 1 ORDER BY orden ASC, nombre ASC`,
    );
    res.json({ data: categories });
});

exports.getById = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;

    const [categories] = await db.execute(`SELECT ${PUBLIC_SELECT} FROM categorias WHERE id = ?`, [id]);
    if (categories.length === 0) {
        throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
    }

    res.json({ data: categories[0] });
});

exports.create = asyncHandler(async (req, res) => {
    const { name, description, imagen_url, sortOrder } = req.validatedData;

    const [result] = await db.execute(
        'INSERT INTO categorias (nombre, descripcion, imagen_url, orden) VALUES (?, ?, ?, ?)',
        [name, description || null, imagen_url ?? null, sortOrder || 0],
    );

    res.status(201).json({
        data: {
            id: result.insertId,
            name,
            description: description || null,
            imagen_url: imagen_url ?? null,
            sortOrder: sortOrder || 0,
        },
    });
});

exports.update = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    const fields = req.validatedData;

    if (Object.keys(fields).length === 0) {
        throw new AppError('No fields to update', 400, 'NO_FIELDS');
    }

    const columnMap = {
        name: 'nombre',
        description: 'descripcion',
        imagen_url: 'imagen_url',
        sortOrder: 'orden',
        active: 'activo',
    };

    const setClauses = [];
    const values = [];

    for (const [key, value] of Object.entries(fields)) {
        const col = columnMap[key];
        if (!col) continue;
        setClauses.push(`${col} = ?`);
        values.push(typeof value === 'boolean' ? (value ? 1 : 0) : value);
    }

    if (setClauses.length === 0) {
        throw new AppError('No valid fields to update', 400, 'NO_FIELDS');
    }

    setClauses.push('fecha_modificacion = CURRENT_TIMESTAMP');
    values.push(id);
    await db.execute(`UPDATE categorias SET ${setClauses.join(', ')} WHERE id = ?`, values);

    const [rows] = await db.execute(`SELECT ${PUBLIC_SELECT} FROM categorias WHERE id = ?`, [id]);

    res.json({ data: rows[0] || null, message: 'Category updated successfully' });
});

exports.remove = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;

    await db.execute('UPDATE categorias SET activo = 0, fecha_modificacion = CURRENT_TIMESTAMP WHERE id = ?', [
        id,
    ]);

    res.json({ message: 'Category deactivated successfully' });
});
