const db = require('../config/database');
const { TIPO_PRODUCTO } = require('../config/constants');
const productoRepository = require('../repositories/productoRepository');
const productoComponenteRepository = require('../repositories/productoComponenteRepository');
const categoriaRepository = require('../repositories/categoriaRepository');
const { AppError } = require('../middlewares/errorHandler');
const { mapMysqlDriverError } = require('../utils/mysqlErrors');
const { computePromoAvailabilityFromComponents } = require('../utils/promoProductAvailability');
const adminProductosService = require('./adminProductosService');
const { mapaDisponibilidadPorPromoIds } = require('./productoStockVentaService');

const ejecutarConMapaMysql = async (fn) => {
    try {
        return await fn();
    } catch (err) {
        const mapped = mapMysqlDriverError(err);
        if (mapped) throw mapped;
        throw err;
    }
};

/**
 * Consolida componentes duplicados sumando cantidades.
 * @param {Array<{ producto_hijo_id: number, cantidad: number }>} componentes
 * @param {{ productoPromoId?: number }} opts
 */
const consolidarComponentes = (componentes, opts = {}) => {
    const map = new Map();
    for (const row of componentes) {
        const hid = row.producto_hijo_id;
        if (opts.productoPromoId != null && hid === opts.productoPromoId) {
            throw new AppError(
                'La promoción no puede incluirse a sí misma como componente',
                400,
                'PROMO_AUTO_COMPONENTE',
            );
        }
        map.set(hid, (map.get(hid) || 0) + row.cantidad);
    }
    return [...map.entries()].map(([producto_hijo_id, cantidad]) => ({ producto_hijo_id, cantidad }));
};

const asegurarCategoriaActiva = async (categoriaId) => {
    const cat = await categoriaRepository.buscarPorId(categoriaId);
    if (!cat) {
        throw new AppError('La categoría no existe', 400, 'CATEGORIA_NO_ENCONTRADA');
    }
    if (!Number(cat.activo)) {
        throw new AppError('La categoría está inactiva; elegí una categoría activa', 400, 'CATEGORIA_INACTIVA');
    }
    return cat;
};

const asegurarPromoExiste = async (id) => {
    const fila = await productoRepository.buscarPorIdAdmin(id);
    if (!fila || fila.tipo_producto !== TIPO_PRODUCTO.PROMOCION) {
        throw new AppError('Promoción no encontrada', 404, 'PROMO_PRODUCTO_NO_ENCONTRADA');
    }
    return fila;
};

/**
 * @param {import('mysql2/promise').PoolConnection} conn
 * @param {Array<{ producto_hijo_id: number, cantidad: number }>} normalizados
 */
const validarHijosProducto = async (conn, normalizados) => {
    if (normalizados.length === 0) {
        throw new AppError('Debe indicar al menos un componente', 400, 'PROMO_SIN_COMPONENTES');
    }
    const ids = [...new Set(normalizados.map((c) => c.producto_hijo_id))];
    const placeholders = ids.map(() => '?').join(',');
    const [rows] = await conn.execute(
        `SELECT id, tipo_producto FROM productos WHERE id IN (${placeholders})`,
        ids,
    );
    if (rows.length !== ids.length) {
        throw new AppError('Uno o más componentes no existen', 400, 'PROMO_COMPONENTE_INEXISTENTE');
    }
    for (const r of rows) {
        if (r.tipo_producto !== TIPO_PRODUCTO.PRODUCTO) {
            throw new AppError(
                'Los componentes deben ser productos normales (tipo PRODUCTO)',
                400,
                'PROMO_COMPONENTE_TIPO_INVALIDO',
            );
        }
    }
};

const mapComponenteDetalle = (row) => ({
    producto_hijo_id: row.producto_hijo_id,
    nombre: row.nombre_hijo,
    cantidad: row.cantidad,
    stock: typeof row.stock_hijo === 'bigint' ? Number(row.stock_hijo) : Number(row.stock_hijo),
    precio: Number(row.precio_hijo),
});

/**
 * @param {object} query salida de `listadoPromocionesProductoQuerySchema`
 */
const listar = async (query) => {
    const page = Math.trunc(Number(query.page)) || 1;
    const limit = Math.trunc(Number(query.limit)) || 20;
    const offset = (page - 1) * limit;
    const filters = {
        busqueda: query.busqueda,
        categoria_id: query.categoria_id,
        tipo_producto: TIPO_PRODUCTO.PROMOCION,
        activo: query.activo,
        destacado: query.destacado,
        disponible: query.disponible,
        ordenar: query.ordenar,
    };
    const [filas, total] = await Promise.all([
        productoRepository.listarAdmin(filters, limit, offset),
        productoRepository.contarAdmin(filters),
    ]);
    const ids = filas.map((f) => f.id);
    const [dispMap, totalesPrecioMap] = await Promise.all([
        mapaDisponibilidadPorPromoIds(ids, null),
        productoComponenteRepository.totalesPrecioPorPadres(null, ids),
    ]);
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    const pagination = {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: totalPages > 0 && page < totalPages,
        hasPrevPage: totalPages > 0 && page > 1,
    };
    return {
        promociones: filas.map((fila) => {
            const base = adminProductosService.mapProductoAdminRow(fila);
            const d = dispMap.get(fila.id) ?? { maxVendible: 0, disponibleParaVenta: false };
            const totalComp = totalesPrecioMap.get(fila.id);
            const rawTotal = totalComp != null && Number.isFinite(Number(totalComp)) ? Number(totalComp) : 0;
            const totalComponentes = Math.round(rawTotal * 100) / 100;
            const precioPromo = Number(fila.precio);
            const ahorro = Math.round((totalComponentes - precioPromo) * 100) / 100;
            return {
                ...base,
                total_componentes: totalComponentes,
                ahorro,
                disponibilidad: {
                    max_vendible: d.maxVendible,
                    disponible_para_venta: d.disponibleParaVenta,
                },
            };
        }),
        pagination,
    };
};

const armarDetalle = async (id) => {
    const fila = await asegurarPromoExiste(id);
    const base = adminProductosService.mapProductoAdminRow(fila);
    const rawComponentes = await productoComponenteRepository.listarDetallePorPadre(null, id);
    const componentes = rawComponentes.map(mapComponenteDetalle);
    let totalComponentes = 0;
    for (const c of componentes) {
        totalComponentes += c.precio * c.cantidad;
    }
    const precioPromo = Number(fila.precio);
    const ahorro = totalComponentes - precioPromo;
    const { maxVendible, disponibleParaVenta } = computePromoAvailabilityFromComponents(
        componentes.map((c) => ({ stock: c.stock, cantidad: c.cantidad })),
    );
    return {
        ...base,
        componentes,
        total_componentes: Math.round(totalComponentes * 100) / 100,
        ahorro: Math.round(ahorro * 100) / 100,
        disponibilidad: {
            max_vendible: maxVendible,
            disponible_para_venta: disponibleParaVenta,
        },
    };
};

const obtenerPorId = async (id) => armarDetalle(id);

const crear = async (datos) => {
    const {
        categoria_id,
        nombre,
        descripcion,
        precio,
        stock,
        imagen_url,
        destacado,
        disponible,
        activo,
        orden,
        componentes,
    } = datos;

    await asegurarCategoriaActiva(categoria_id);
    const normalizados = consolidarComponentes(componentes);

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        await validarHijosProducto(conn, normalizados);
        const insertId = await ejecutarConMapaMysql(() =>
            productoRepository.crear(
                {
                    categoria_id,
                    nombre,
                    descripcion: descripcion ?? null,
                    precio,
                    stock,
                    imagen_url: imagen_url ?? null,
                    destacado,
                    disponible,
                    activo,
                    orden,
                    tipo_producto: TIPO_PRODUCTO.PROMOCION,
                },
                conn,
            ),
        );
        await productoComponenteRepository.insertarVarios(conn, insertId, normalizados);
        await conn.commit();
        return armarDetalle(insertId);
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }
};

const actualizar = async (id, campos) => {
    await asegurarPromoExiste(id);

    if (Object.prototype.hasOwnProperty.call(campos, 'categoria_id')) {
        await asegurarCategoriaActiva(campos.categoria_id);
    }

    const { componentes, ...restoProducto } = campos;
    const keysProducto = Object.keys(restoProducto).filter((k) => Object.prototype.hasOwnProperty.call(restoProducto, k));

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        if (keysProducto.length > 0) {
            const afectadas = await ejecutarConMapaMysql(() => productoRepository.actualizar(id, restoProducto, conn));
            if (afectadas === 0) {
                throw new AppError('No hay campos válidos para actualizar', 400, 'SIN_CAMPOS_ACTUALIZACION');
            }
        }

        if (Array.isArray(componentes)) {
            const normalizados = consolidarComponentes(componentes, { productoPromoId: id });
            await validarHijosProducto(conn, normalizados);
            await productoComponenteRepository.eliminarPorPadre(conn, id);
            await productoComponenteRepository.insertarVarios(conn, id, normalizados);
        }

        await conn.commit();
        return armarDetalle(id);
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }
};

const actualizarActivo = async (id, activo) => {
    await asegurarPromoExiste(id);
    const afectadas = await ejecutarConMapaMysql(() => productoRepository.actualizarActivo(id, activo));
    if (afectadas === 0) {
        throw new AppError('Promoción no encontrada', 404, 'PROMO_PRODUCTO_NO_ENCONTRADA');
    }
    return armarDetalle(id);
};

/**
 * Exponer cálculo de disponibilidad para otros módulos (p. ej. pedidos).
 * @param {Array<{ stock: number, cantidad: number }>} componentes
 */
const disponibilidadDesdeComponentes = (componentes) => computePromoAvailabilityFromComponents(componentes);

module.exports = {
    listar,
    obtenerPorId,
    crear,
    actualizar,
    actualizarActivo,
    disponibilidadDesdeComponentes,
};
