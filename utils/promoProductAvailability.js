/**
 * Disponibilidad máxima de una promo según stock de componentes (sin tocar stock del padre).
 * @param {Array<{ stock: number, cantidad: number }>} componentes filas con stock y cantidad requerida (> 0).
 * @returns {{ maxVendible: number, disponibleParaVenta: boolean }}
 */
const computePromoAvailabilityFromComponents = (componentes) => {
    if (!Array.isArray(componentes) || componentes.length === 0) {
        return { maxVendible: 0, disponibleParaVenta: false };
    }
    const ratios = componentes.map(({ stock, cantidad }) => {
        const s = Number(stock);
        const c = Number(cantidad);
        const stockInt = Number.isFinite(s) ? Math.trunc(s) : 0;
        const req = Number.isFinite(c) && c > 0 ? Math.trunc(c) : 0;
        if (req <= 0) return 0;
        return Math.floor(stockInt / req);
    });
    const maxVendible = Math.min(...ratios);
    return {
        maxVendible: maxVendible < 0 ? 0 : maxVendible,
        disponibleParaVenta: maxVendible > 0,
    };
};

module.exports = {
    computePromoAvailabilityFromComponents,
};
