import { completarDias } from './estadisticas.service';

describe('completarDias', () => {
  it('rellena los días sin soportes con cero', () => {
    const serie = completarDias([{ etiqueta: '2026-10-25', total: 4 }], '2026-10-25', 3);
    expect(serie).toEqual([
      { etiqueta: '2026-10-23', total: 0 },
      { etiqueta: '2026-10-24', total: 0 },
      { etiqueta: '2026-10-25', total: 4 },
    ]);
  });
});
