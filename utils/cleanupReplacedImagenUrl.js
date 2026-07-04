const { resolvePublicIdFromUrl, deleteImageFromFileServer } = require('../config/fileStorage');

/**
 * Elimina del file server la imagen anterior cuando se reemplaza imagen_url.
 * Solo actúa sobre URLs del dominio configurado en FILES_BASE_URL.
 *
 * @param {string|null|undefined} imagenAnterior
 * @param {string|null|undefined} imagenNueva
 */
const cleanupReplacedImagenUrl = async (imagenAnterior, imagenNueva) => {
    const anterior = imagenAnterior || null;
    const nueva = imagenNueva || null;
    if (!anterior || anterior === nueva) return;

    const publicId = resolvePublicIdFromUrl(anterior);
    if (publicId) {
        await deleteImageFromFileServer(publicId);
    }
};

module.exports = { cleanupReplacedImagenUrl };
