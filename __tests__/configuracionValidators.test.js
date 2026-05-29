const { updateHorarioDiaSchema } = require('../validators/configuracionValidators');

describe('configuracionValidators — horarios/dia', () => {
    test('acepta franja nocturna 20:00 → 02:30', () => {
        const parsed = updateHorarioDiaSchema.parse({
            dia_semana: 5,
            franjas: [
                {
                    hora_apertura: '20:00',
                    hora_cierre: '02:30',
                    activo: true,
                },
            ],
        });
        expect(parsed.franjas[0].hora_apertura).toBe('20:00');
        expect(parsed.franjas[0].hora_cierre).toBe('02:30');
    });
});
