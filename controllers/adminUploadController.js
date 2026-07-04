const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middlewares/errorHandler');
const { uploadImageToFileServer } = require('../config/fileStorage');

exports.uploadImagen = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new AppError('Debe enviar un archivo en el campo "imagen"', 400, 'IMAGEN_REQUERIDA');
    }

    if (req.file.size > 5 * 1024 * 1024) {
        throw new AppError('El tamaño máximo permitido es 5 MB', 400, 'IMAGEN_DEMASIADO_GRANDE');
    }

    const result = await uploadImageToFileServer(req.file.buffer, {
        mimetype: req.file.mimetype,
    });

    res.status(201).json({
        data: {
            imagen_url: result.secure_url,
            public_id: result.public_id,
            format: result.format,
            size: result.size,
        },
    });
});
