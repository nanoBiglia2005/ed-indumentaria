// Tests de formatearFechaHora (utils/formato.ts).
//
// QUE REGLA PROTEGE: un instante (timestamptz, p. ej. REPORTES.fecha_generado)
// se muestra en hora argentina sin importar la zona de la PC. Un reporte
// generado a las 23:30 no puede figurar con fecha del dia siguiente (que es lo
// que pasaria leyendolo en UTC), y el listado tiene que decir lo mismo que el
// encabezado del PDF (backend/services/reportes.js).
import { describe, it, expect } from 'vitest';
import { formatearFechaHora } from '@/utils/formato';

describe('formatearFechaHora', () => {
  it('muestra la hora argentina, no la UTC', () => {
    // 02:30 UTC del 30/09 = 23:30 del 29/09 en Buenos Aires.
    expect(formatearFechaHora('2026-09-30T02:30:00Z')).toBe('29/09/2026 23:30');
  });

  it('usa 00 para la medianoche, no 24', () => {
    expect(formatearFechaHora(new Date('2026-09-30T03:00:00Z'))).toBe('30/09/2026 00:00');
  });
});
