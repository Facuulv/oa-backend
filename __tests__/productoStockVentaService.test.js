const { mapaDisponibilidadPorPromoIds, verificarStockSuficienteParaVenta } = require('../services/productoStockVentaService');
const productoComponenteRepository = require('../repositories/productoComponenteRepository');

jest.mock('../repositories/productoComponenteRepository', () => ({
    listarFilasStockPorPadres: jest.fn(),
    listarDetallePorPadre: jest.fn(),
}));

describe('mapaDisponibilidadPorPromoIds', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('devuelve mapa vacío sin ids', async () => {
        const m = await mapaDisponibilidadPorPromoIds([]);
        expect(m.size).toBe(0);
        expect(productoComponenteRepository.listarFilasStockPorPadres).not.toHaveBeenCalled();
    });

    it('agrupa por padre y calcula mínimo de floor(stock/cantidad)', async () => {
        productoComponenteRepository.listarFilasStockPorPadres.mockResolvedValue([
            { producto_padre_id: 1, producto_hijo_id: 10, cantidad: 1, stock_hijo: 10 },
            { producto_padre_id: 1, producto_hijo_id: 11, cantidad: 1, stock_hijo: 3 },
        ]);
        const m = await mapaDisponibilidadPorPromoIds([1]);
        expect(m.get(1)).toEqual({ maxVendible: 3, disponibleParaVenta: true });
    });
});

describe('verificarStockSuficienteParaVenta', () => {
    it('exige conexión', async () => {
        await expect(verificarStockSuficienteParaVenta(null, 1, 1)).rejects.toMatchObject({
            code: 'STOCK_CONN_REQUERIDA',
        });
    });
});
