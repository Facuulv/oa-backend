const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middlewares/errorHandler');
const productoRepository = require('../repositories/productoRepository');

exports.list = asyncHandler(async (req, res) => {
    const { categoryId, featured, search } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const offset = (page - 1) * limit;

    const filters = {
        categoryId: categoryId || undefined,
        featured: featured === 'true' || featured === true,
        search: search || undefined,
    };

    const [products, total] = await Promise.all([
        productoRepository.listarPublicos(filters, limit, offset),
        productoRepository.contarPublicos(filters),
    ]);

    res.json({
        data: products,
        pagination: { page, limit, total },
    });
});

exports.getById = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;

    const product = await productoRepository.buscarPublicoPorId(id);

    if (!product) {
        throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    res.json({ data: product });
});
