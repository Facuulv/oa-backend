const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middlewares/errorHandler');
const productoRepository = require('../repositories/productoRepository');
const { TIPO_PRODUCTO } = require('../config/constants');
const { mapaDisponibilidadPorPromoIds } = require('../services/productoStockVentaService');

const enrichPublicProductsWithPromoStock = async (rows) => {
    if (!Array.isArray(rows) || rows.length === 0) {
        return rows;
    }
    const promoIds = rows.filter((p) => p.product_type === TIPO_PRODUCTO.PROMOCION).map((p) => p.id);
    if (promoIds.length === 0) {
        return rows;
    }
    const dispMap = await mapaDisponibilidadPorPromoIds(promoIds, null);
    return rows.map((p) => {
        if (p.product_type !== TIPO_PRODUCTO.PROMOCION) {
            return p;
        }
        const d = dispMap.get(p.id) ?? { maxVendible: 0, disponibleParaVenta: false };
        return {
            ...p,
            estimated_availability: d.maxVendible,
            available_by_component_stock: d.disponibleParaVenta,
        };
    });
};

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
        data: await enrichPublicProductsWithPromoStock(products),
        pagination: { page, limit, total },
    });
});

exports.getById = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;

    const product = await productoRepository.buscarPublicoPorId(id);

    if (!product) {
        throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    const [enriched] = await enrichPublicProductsWithPromoStock([product]);
    res.json({ data: enriched });
});
