const productoRepository = require('../repositories/productoRepository');
const categoriaRepository = require('../repositories/categoriaRepository');
const { AppError } = require('../middlewares/errorHandler');
const { mapMysqlDriverError } = require('../utils/mysqlErrors');

/**
 * @param {object|null} fila
 * @returns {object|null}
 */
const mapFila = (fila) => {
    if (!fila) return null;
    return {
        id: fila.id,
        nombre: fila.nombre,
        descripcion: fila.descripcion,
        precio: Number(fila.precio),
        categoria_id: fila.categoria_id,
        categoria:
            fila.categoria_nombre != null
                ? {
                      id: fila.categoria_id,
                      nombre: fila.categoria_nombre,
                      activo: Boolean(Number(fila.categoria_activo)),
                  }
                : null,
        imagen_url: fila.imagen_url,
        stock: typeof fila.stock === 'bigint' ? Number(fila.stock) : fila.stock,
        destacado: Boolean(Number(fila.destacado)),
        disponible: Boolean(Number(fila.disponible)),
        activo: Boolean(Number(fila.activo)),
        orden: fila.orden,
        fecha_creacion: fila.fecha_creacion,
        fecha_modificacion: fila.fecha_modificacion,
    };
};

const ejecutarConMapaMysql = async (fn) => {
    try {
        return await fn();
    } catch (err) {
        const mapped = mapMysqlDriverError(err);
        if (mapped) throw mapped;
        throw err;
    }
};

const asegurarExiste = async (id) => {
    const fila = await productoRepository.buscarPorIdAdmin(id);
    if (!fila) {
        throw new AppError('Producto no encontrado', 404, 'PRODUCTO_NO_ENCONTRADO');
    }
    return fila;
};

/**
 * @param {number} categoriaId
 * @param {{ requiereActiva: boolean }} opts
 */
const asegurarCategoria = async (categoriaId, { requiereActiva }) => {
    const cat = await categoriaRepository.buscarPorId(categoriaId);
    if (!cat) {
        throw new AppError('La categoría no existe', 400, 'CATEGORIA_NO_ENCONTRADA');
    }
    if (requiereActiva && !Number(cat.activo)) {
        throw new AppError('La categoría está inactiva; elegí una categoría activa', 400, 'CATEGORIA_INACTIVA');
    }
    return cat;
};

/**
 * @param {object} query salida de `listadoProductosQuerySchema`
 */
const listar = async (query) => {
    const page = Math.trunc(Number(query.page)) || 1;
    const limit = Math.trunc(Number(query.limit)) || 20;
    const offset = (page - 1) * limit;
    const filters = {
        busqueda: query.busqueda,
        categoria_id: query.categoria_id,
        activo: query.activo,
        destacado: query.destacado,
        disponible: query.disponible,
        ordenar: query.ordenar,
    };
    const [filas, total] = await Promise.all([
        productoRepository.listarAdmin(filters, limit, offset),
        productoRepository.contarAdmin(filters),
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
        productos: filas.map(mapFila),
        pagination,
    };
};

const obtenerPorId = async (id) => {
    const fila = await productoRepository.buscarPorIdAdmin(id);
    if (!fila) {
        throw new AppError('Producto no encontrado', 404, 'PRODUCTO_NO_ENCONTRADO');
    }
    return mapFila(fila);
};

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
    } = datos;

    await asegurarCategoria(categoria_id, { requiereActiva: true });

    const id = await ejecutarConMapaMysql(() =>
        productoRepository.crear({
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
        }),
    );
    return obtenerPorId(id);
};

const actualizar = async (id, campos) => {
    await asegurarExiste(id);

    if (Object.prototype.hasOwnProperty.call(campos, 'categoria_id')) {
        await asegurarCategoria(campos.categoria_id, { requiereActiva: true });
    }

    const afectadas = await ejecutarConMapaMysql(() => productoRepository.actualizar(id, campos));
    if (afectadas === 0) {
        const existe = await productoRepository.buscarPorIdAdmin(id);
        if (!existe) {
            throw new AppError('Producto no encontrado', 404, 'PRODUCTO_NO_ENCONTRADO');
        }
        throw new AppError('No hay campos válidos para actualizar', 400, 'SIN_CAMPOS_ACTUALIZACION');
    }
    return obtenerPorId(id);
};

const actualizarEstado = async (id, activo) => {
    await asegurarExiste(id);
    const afectadas = await ejecutarConMapaMysql(() => productoRepository.actualizarActivo(id, activo));
    if (afectadas === 0) {
        throw new AppError('Producto no encontrado', 404, 'PRODUCTO_NO_ENCONTRADO');
    }
    return obtenerPorId(id);
};

const desactivar = async (id) => {
    await asegurarExiste(id);
    await ejecutarConMapaMysql(() => productoRepository.desactivar(id));
    const fila = await productoRepository.buscarPorIdAdmin(id);
    return {
        producto: mapFila(fila),
        mensaje: 'Producto desactivado (baja lógica). El registro se conserva por pedidos vinculados.',
    };
};

module.exports = {
    listar,
    obtenerPorId,
    crear,
    actualizar,
    actualizarEstado,
    desactivar,
};
