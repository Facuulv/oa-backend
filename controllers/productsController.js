const db = require('../config/database');
const { uploadToCloudinary, deleteFromCloudinary, uploadSingle } = require('../config/cloudinary');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middlewares/errorHandler');

const PRODUCT_SELECT = `p.id,
        p.categoria_id AS category_id,
        p.nombre AS name,
        p.descripcion AS description,
        p.precio AS price,
        p.stock,
        p.imagen_url AS image_url,
        p.destacado AS featured,
        p.disponible AS available,
        p.activo AS active,
        p.orden AS sort_order,
        p.fecha_creacion AS created_at,
        p.fecha_modificacion AS updated_at,
        c.nombre AS category_name`;

exports.list = asyncHandler(async (req, res) => {
    const { categoryId, featured, search } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    let where = 'WHERE p.activo = 1';
    const params = [];

    if (categoryId) {
        where += ' AND p.categoria_id = ?';
        params.push(categoryId);
    }
    if (featured === 'true') {
        where += ' AND p.destacado = 1';
    }
    if (search) {
        where += ' AND (p.nombre LIKE ? OR p.descripcion LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
    }

    const [products] = await db.execute(
        `SELECT ${PRODUCT_SELECT}
         FROM productos p
         LEFT JOIN categorias c ON p.categoria_id = c.id
         ${where}
         ORDER BY p.orden ASC, p.nombre ASC
         LIMIT ? OFFSET ?`,
        [...params, String(limit), String(offset)],
    );

    const [countResult] = await db.execute(`SELECT COUNT(*) as total FROM productos p ${where}`, params);

    res.json({
        data: products,
        pagination: { page, limit, total: countResult[0].total },
    });
});

exports.getById = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;

    const [products] = await db.execute(
        `SELECT ${PRODUCT_SELECT}
         FROM productos p
         LEFT JOIN categorias c ON p.categoria_id = c.id
         WHERE p.id = ?`,
        [id],
    );

    if (products.length === 0) {
        throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    res.json({ data: products[0] });
});

exports.create = asyncHandler(async (req, res) => {
    const { categoryId, name, description, price, imageUrl, available, featured, sortOrder, stock } =
        req.validatedData;

    const [result] = await db.execute(
        `INSERT INTO productos (categoria_id, nombre, descripcion, precio, stock, imagen_url, disponible, destacado, orden)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            categoryId,
            name,
            description || null,
            price,
            stock ?? 0,
            imageUrl || null,
            available ? 1 : 0,
            featured ? 1 : 0,
            sortOrder || 0,
        ],
    );

    res.status(201).json({
        data: { id: result.insertId, categoryId, name, price },
    });
});

exports.update = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    const fields = req.validatedData;

    const columnMap = {
        categoryId: 'categoria_id',
        name: 'nombre',
        description: 'descripcion',
        price: 'precio',
        stock: 'stock',
        imageUrl: 'imagen_url',
        available: 'disponible',
        featured: 'destacado',
        sortOrder: 'orden',
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
    await db.execute(`UPDATE productos SET ${setClauses.join(', ')} WHERE id = ?`, values);

    res.json({ message: 'Product updated successfully' });
});

exports.remove = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;

    await db.execute('UPDATE productos SET activo = 0, fecha_modificacion = CURRENT_TIMESTAMP WHERE id = ?', [id]);

    res.json({ message: 'Product deactivated successfully' });
});

exports.uploadImage = [
    uploadSingle,
    asyncHandler(async (req, res) => {
        if (!req.file) {
            throw new AppError('No image file provided', 400, 'NO_FILE');
        }

        const result = await uploadToCloudinary(req.file.buffer);
        res.json({ imageUrl: result.url, publicId: result.publicId });
    }),
];

exports.deleteImage = asyncHandler(async (req, res) => {
    const { publicId } = req.body;

    if (!publicId) {
        throw new AppError('publicId is required', 400, 'NO_PUBLIC_ID');
    }

    await deleteFromCloudinary(publicId);
    res.json({ message: 'Image deleted successfully' });
});
