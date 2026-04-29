const { TIPO_PRODUCTO } = require('../config/constants');
const { AppError } = require('../middlewares/errorHandler');
const { computePromoAvailabilityFromComponents } = require('../utils/promoProductAvailability');
const productoComponenteRepository = require('../repositories/productoComponenteRepository');

const cantidadVentaEntera = (cantidadVendida) => {
    const qty = Math.trunc(Number(cantidadVendida));
    if (!Number.isFinite(qty) || qty <= 0) {
        throw new AppError('La cantidad vendida debe ser un entero positivo', 400, 'CANTIDAD_INVALIDA');
    }
    return qty;
};

const numStock = (v) => {
    if (typeof v === 'bigint') return Number(v);
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

/**
 * Mapa producto_padre_id → { maxVendible, disponibleParaVenta } según stock actual de componentes.
 * @param {number[]} productoPadreIds
 * @param {import('mysql2/promise').PoolConnection|null} [conn]
 * @returns {Promise<Map<number, { maxVendible: number, disponibleParaVenta: boolean }>>}
 */
const mapaDisponibilidadPorPromoIds = async (productoPadreIds, conn = null) => {
    const ids = [...new Set((productoPadreIds || []).map((id) => Math.trunc(Number(id))).filter((n) => n > 0))];
    const map = new Map();
    if (ids.length === 0) {
        return map;
    }
    const flat = await productoComponenteRepository.listarFilasStockPorPadres(conn, ids);
    const byPadre = new Map(ids.map((id) => [id, []]));
    for (const r of flat) {
        const pid = r.producto_padre_id;
        const arr = byPadre.get(pid);
        if (arr) {
            arr.push({ stock: numStock(r.stock_hijo), cantidad: Math.trunc(Number(r.cantidad)) || 0 });
        }
    }
    for (const id of ids) {
        map.set(id, computePromoAvailabilityFromComponents(byPadre.get(id) || []));
    }
    return map;
};

/**
 * Bloquea filas necesarias y comprueba stock sin mutar.
 * Debe ejecutarse dentro de una transacción abierta por el llamador.
 * @param {import('mysql2/promise').PoolConnection} conn
 * @param {number} productoId
 * @param {number} cantidadVendida
 * @returns {Promise<void>}
 */
const verificarStockSuficienteParaVenta = async (conn, productoId, cantidadVendida) => {
    if (!conn) {
        throw new AppError('Se requiere conexión para verificación de stock', 500, 'STOCK_CONN_REQUERIDA');
    }
    const qty = cantidadVentaEntera(cantidadVendida);
    const [parentRows] = await conn.execute(
        'SELECT id, tipo_producto, stock FROM productos WHERE id = ? FOR UPDATE',
        [productoId],
    );
    const parent = parentRows[0];
    if (!parent) {
        throw new AppError('Producto no encontrado', 404, 'PRODUCTO_NO_ENCONTRADO');
    }

    if (parent.tipo_producto === TIPO_PRODUCTO.PRODUCTO) {
        if (numStock(parent.stock) < qty) {
            throw new AppError('Stock insuficiente', 409, 'INSUFFICIENT_STOCK');
        }
        return;
    }

    if (parent.tipo_producto === TIPO_PRODUCTO.PROMOCION) {
        const raw = await productoComponenteRepository.listarDetallePorPadre(conn, productoId);
        if (!raw.length) {
            throw new AppError('La promoción no tiene componentes configurados', 400, 'PROMO_SIN_COMPONENTES');
        }
        const childIds = [...new Set(raw.map((r) => r.producto_hijo_id))].sort((a, b) => a - b);
        for (const hid of childIds) {
            await conn.execute('SELECT id, stock FROM productos WHERE id = ? FOR UPDATE', [hid]);
        }
        const refreshed = await productoComponenteRepository.listarDetallePorPadre(conn, productoId);
        const componentes = refreshed.map((r) => ({
            stock: numStock(r.stock_hijo),
            cantidad: Math.trunc(Number(r.cantidad)) || 0,
        }));
        const { maxVendible } = computePromoAvailabilityFromComponents(componentes);
        if (maxVendible < qty) {
            throw new AppError('Stock insuficiente para la promoción', 409, 'INSUFFICIENT_STOCK');
        }
        return;
    }

    throw new AppError('Tipo de producto no soportado para stock', 400, 'TIPO_PRODUCTO_STOCK_INVALIDO');
};

/**
 * Descuenta stock según tipo (PRODUCTO: fila del ítem; PROMOCION: componentes × cantidad vendida).
 * Requiere `conn` con transacción activa (`beginTransaction`). Ante cualquier fallo el llamador debe hacer rollback.
 * @param {import('mysql2/promise').PoolConnection} conn
 * @param {number} productoId
 * @param {number} cantidadVendida
 * @returns {Promise<void>}
 */
const descontarStockVenta = async (conn, productoId, cantidadVendida) => {
    if (!conn) {
        throw new AppError('Se requiere conexión para descuento de stock', 500, 'STOCK_CONN_REQUERIDA');
    }
    const qty = cantidadVentaEntera(cantidadVendida);
    await verificarStockSuficienteParaVenta(conn, productoId, qty);

    const [parentRows] = await conn.execute('SELECT id, tipo_producto FROM productos WHERE id = ? FOR UPDATE', [
        productoId,
    ]);
    const parent = parentRows[0];
    if (!parent) {
        throw new AppError('Producto no encontrado', 404, 'PRODUCTO_NO_ENCONTRADO');
    }

    if (parent.tipo_producto === TIPO_PRODUCTO.PRODUCTO) {
        const [upd] = await conn.execute(
            'UPDATE productos SET stock = stock - ?, fecha_modificacion = CURRENT_TIMESTAMP WHERE id = ? AND stock >= ?',
            [qty, productoId, qty],
        );
        if (!upd.affectedRows) {
            throw new AppError('Stock insuficiente', 409, 'INSUFFICIENT_STOCK');
        }
        return;
    }

    if (parent.tipo_producto === TIPO_PRODUCTO.PROMOCION) {
        const lineas = await productoComponenteRepository.listarDetallePorPadre(conn, productoId);
        if (!lineas.length) {
            throw new AppError('La promoción no tiene componentes configurados', 400, 'PROMO_SIN_COMPONENTES');
        }
        for (const r of lineas) {
            const need = (Math.trunc(Number(r.cantidad)) || 0) * qty;
            if (need <= 0) {
                throw new AppError('Componente con cantidad inválida', 400, 'PROMO_COMPONENTE_CANTIDAD_INVALIDA');
            }
            const hid = r.producto_hijo_id;
            const [upd] = await conn.execute(
                'UPDATE productos SET stock = stock - ?, fecha_modificacion = CURRENT_TIMESTAMP WHERE id = ? AND stock >= ?',
                [need, hid, need],
            );
            if (!upd.affectedRows) {
                throw new AppError('Stock insuficiente', 409, 'INSUFFICIENT_STOCK');
            }
        }
    }
};

module.exports = {
    mapaDisponibilidadPorPromoIds,
    verificarStockSuficienteParaVenta,
    descontarStockVenta,
};
