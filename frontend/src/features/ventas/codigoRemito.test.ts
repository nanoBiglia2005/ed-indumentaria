// Tests de codigoRemito.ts — el codigo con el que se identifica un remito en
// pantalla. El numero correlativo lo asigna el trigger trg_cod_remito_final.
import { describe, it, expect } from 'vitest';
import { codigoRemito } from '@/features/ventas/codigoRemito';

describe('codigoRemito', () => {
  it('arma MM-numero con el mes en dos digitos', () => {
    expect(codigoRemito(3, 42)).toBe('03-42');
    expect(codigoRemito(12, 7)).toBe('12-7');
  });

  it('devuelve null si el remito todavia no tiene numero', () => {
    // Los remitos anteriores al trigger no lo tienen; quien lo muestre decide
    // el reemplazo.
    expect(codigoRemito(3, null)).toBeNull();
    expect(codigoRemito(3, undefined)).toBeNull();
  });

  it('el numero CERO es un numero valido, no una ausencia', () => {
    // Compara contra null/undefined, no por falsy: si esto cambiara, el remito
    // numero 0 dejaria de mostrarse.
    expect(codigoRemito(3, 0)).toBe('03-0');
  });

  it('usa 00 cuando falta el mes', () => {
    expect(codigoRemito(null, 5)).toBe('00-5');
    expect(codigoRemito(undefined, 5)).toBe('00-5');
  });

  it('el mes cero se muestra como 00', () => {
    expect(codigoRemito(0, 5)).toBe('00-5');
  });
});
