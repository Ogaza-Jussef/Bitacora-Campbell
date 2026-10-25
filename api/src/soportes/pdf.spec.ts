import { renderListaPdf, renderSoportePdf } from './pdf';
import type { Soporte } from './soporte';

const soporte: Soporte = {
  id: '1792785046710',
  solicitante: 'Patricia Bermejo',
  areaId: 1,
  area: 'Calidad',
  descripcion: 'Limpieza de memorias equipos',
  tipo: 'Chequeo',
  fechaSolicitud: '2026-10-23',
  fechaEntrega: '2026-10-23',
  tiempoSoporte: '10 min',
  tecnicoId: 1,
  tecnico: 'Personal de Soporte',
  actualizadoEn: null,
  version: 1,
};

describe('PDF con plantilla FO-AF-034', () => {
  it('genera el listado en un PDF', async () => {
    const pdf = await renderListaPdf([soporte], ['Área: Calidad']);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(1000);
  });

  it('genera el soporte individual con la misma plantilla', async () => {
    const pdf = await renderSoportePdf(soporte);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  });
});
