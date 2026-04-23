const categoriaRepository = require('../repositories/categoriaRepository');
const { AppError } = require('../middlewares/errorHandler');
const { mapMysqlDriverError } = require('../utils/mysqlErrors');

/**
 * Respuesta uniforme para el panel admin (activo como booleano JSON).
 * @param {object|null} fila
 * @returns {object|null}
 */
const mapFila = (fila) => {
    if (!fila) return null;
    return {
        id: fila.id,
        nombre: fila.nombre,
        descripcion: fila.descripcion,
        imagen_url: fila.imagen_url,
        orden: fila.orden,
        activo: Boolean(Number(fila.activo)),
        fecha_creacion: fila.fecha_creacion,
        fecha_modificacion: fila.fecha_modificacion,
    };
};

const asegurarExiste = async (id) => {
    const fila = await categoriaRepository.buscarPorId(id);
    if (!fila) {
        throw new AppError('Categoría no encontrada', 404, 'CATEGORIA_NO_ENCONTRADA');
    }
    return fila;
};

const asegurarNombreNoDuplicado = async (nombre, excluirId = null) => {
    const conflictoId = await categoriaRepository.buscarIdPorNombreNormalizado(nombre, excluirId);
    if (conflictoId != null) {
        throw new AppError('Ya existe una categoría con ese nombre', 409, 'CATEGORIA_DUPLICADA');
    }
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

const listar = async () => {
    const filas = await categoriaRepository.listarTodas();
    return filas.map(mapFila);
};

const crear = async (datos) => {
    const { nombre, descripcion, imagen_url, orden, activo } = datos;
    await asegurarNombreNoDuplicado(nombre);
    const id = await ejecutarConMapaMysql(() =>
        categoriaRepository.crear({
            nombre,
            descripcion: descripcion ?? null,
            imagen_url: imagen_url ?? null,
            orden,
            activo,
        }),
    );
    const creada = await categoriaRepository.buscarPorId(id);
    return mapFila(creada);
};

const actualizar = async (id, campos) => {
    await asegurarExiste(id);
    if (Object.prototype.hasOwnProperty.call(campos, 'nombre')) {
        await asegurarNombreNoDuplicado(campos.nombre, id);
    }
    const afectadas = await ejecutarConMapaMysql(() => categoriaRepository.actualizar(id, campos));
    if (afectadas === 0) {
        const existe = await categoriaRepository.buscarPorId(id);
        if (!existe) {
            throw new AppError('Categoría no encontrada', 404, 'CATEGORIA_NO_ENCONTRADA');
        }
        throw new AppError('No hay campos válidos para actualizar', 400, 'SIN_CAMPOS_ACTUALIZACION');
    }
    return mapFila(await categoriaRepository.buscarPorId(id));
};

const actualizarEstado = async (id, activo) => {
    await asegurarExiste(id);
    const afectadas = await ejecutarConMapaMysql(() => categoriaRepository.actualizarActivo(id, activo));
    if (afectadas === 0) {
        throw new AppError('Categoría no encontrada', 404, 'CATEGORIA_NO_ENCONTRADA');
    }
    return mapFila(await categoriaRepository.buscarPorId(id));
};

/**
 * Borrado lógico únicamente: `productos.categoria_id` referencia `categorias.id`
 * con clave foránea; un DELETE físico fallaría o rompería integridad si hubiera productos.
 */
const eliminar = async (id) => {
    await asegurarExiste(id);
    const productos_relacionados = await categoriaRepository.contarProductosPorCategoria(id);
    await ejecutarConMapaMysql(() => categoriaRepository.eliminarLogico(id));
    const fila = await categoriaRepository.buscarPorId(id);
    const mensaje =
        productos_relacionados > 0
            ? 'Categoría desactivada. Hay productos asociados; el registro se conserva por la clave foránea en productos.'
            : 'Categoría desactivada.';
    return {
        categoria: mapFila(fila),
        productos_relacionados,
        mensaje,
    };
};

module.exports = {
    listar,
    crear,
    actualizar,
    actualizarEstado,
    eliminar,
};
