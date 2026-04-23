const { AppError } = require('../middlewares/errorHandler');

/**
 * Convierte errores conocidos de mysql2 en AppError operacional, o null si no aplica.
 * @param {{ code?: string, errno?: number }} err
 * @returns {AppError|null}
 */
const mapMysqlDriverError = (err) => {
    if (!err || typeof err !== 'object') return null;

    switch (err.code) {
        case 'ER_DUP_ENTRY':
            return new AppError(
                'Ya existe un registro con esos datos únicos',
                409,
                'DB_DUPLICATE_ENTRY',
            );
        case 'ER_ROW_IS_REFERENCED_2':
        case 'ER_ROW_IS_REFERENCED':
            return new AppError(
                'No se puede completar la operación por productos u otros registros vinculados',
                409,
                'DB_REFERENCE_CONSTRAINT',
            );
        case 'ER_NO_REFERENCED_ROW_2':
            return new AppError('Referencia inválida en la base de datos', 400, 'DB_INVALID_REFERENCE');
        default:
            return null;
    }
};

module.exports = { mapMysqlDriverError };
