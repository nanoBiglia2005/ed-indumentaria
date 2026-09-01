// Tests de utils/precios.ts
//
// redondearPrecio y precioConRecargo estan DUPLICADAS linea por linea en
// backend/services/preciosPorMetodo.js. Los casos de los dos primeros bloques
// son los mismos que en backend/test/precios.test.js a proposito: si algun dia
// las implementaciones divergen, el precio que se muestra en pantalla deja de
// coincidir con el que se cobra.
import { describe, it, expect } from 'vitest';
import { redondearPrecio, precioConRecargo, preciosDeArticuloPorMetodo } from '@/utils/precios';

const EFECTIVO = { id_tipos_de_pago: 1, recargo: 0 };
const TARJETA = { id_tipos_de_pago: 2, recargo: 10 };

describe('redondearPrecio (espejo del backend)', () => {
  it('lleva a multiplos de 10', () => {
    expect(redondearPrecio(0)).toBe(0);
    expect(redondearPrecio(100)).toBe(100);
    expect(redondearPrecio(104)).toBe(100);
    expect(redondearPrecio(105)).toBe(110);
    expect(redondearPrecio(94)).toBe(90);
    expect(redondearPrecio(95)).toBe(100);
  });

  it('redondea DOS veces: primero al entero, despues a la decena', () => {
    // 14.6 -> 15 -> 20. Redondeando directo a la decena daria 10.
    expect(redondearPrecio(14.6)).toBe(20);
    expect(redondearPrecio(14.4)).toBe(10);
  });

  it('con negativos redondea hacia +infinito, como Math.round', () => {
    expect(redondearPrecio(-15)).toBe(-10);
    expect(redondearPrecio(-16)).toBe(-20);
  });
});

describe('precioConRecargo (espejo del backend)', () => {
  it('aplica el porcentaje y redondea', () => {
    expect(precioConRecargo(1000, 0)).toBe(1000);
    expect(precioConRecargo(1000, 10)).toBe(1100);
    expect(precioConRecargo(1000, 15)).toBe(1150);
    expect(precioConRecargo(100, 5)).toBe(110);
  });

  it('con recargo 0 igual redondea el precio base', () => {
    expect(precioConRecargo(997, 0)).toBe(1000);
  });

  it('siempre devuelve un multiplo de 10', () => {
    for (const precio of [1, 7, 33, 101, 999, 12345]) {
      for (const recargo of [0, 5, 10, 12.5, 30]) {
        expect(precioConRecargo(precio, recargo) % 10).toBe(0);
      }
    }
  });
});

describe('preciosDeArticuloPorMetodo', () => {
  it('NO redondea el metodo sin recargo (diferencia deliberada con el backend)', () => {
    // Documentado en precios.ts:10-13: el metodo sin recargo no cobra nada de
    // mas, asi que redondearlo solo mostraria un numero distinto al que se
    // tipeo mientras se edita. El backend SI redondea, porque es lo que cobra.
    // Este test existe para que nadie "unifique" las dos y rompa la edicion.
    const [efectivo] = preciosDeArticuloPorMetodo(997, [EFECTIVO]);
    expect(efectivo.precio).toBe(997);
  });

  it('aplica la regla del sistema a los metodos con recargo', () => {
    // Con recargo si se parte del precio ya redondeado: 997 -> 1000 -> 1100.
    const [tarjeta] = preciosDeArticuloPorMetodo(997, [TARJETA]);
    expect(tarjeta.precio).toBe(1100);
  });

  it('conserva el orden de los metodos y devuelve el metodo junto al precio', () => {
    const resultado = preciosDeArticuloPorMetodo(1000, [EFECTIVO, TARJETA]);

    expect(resultado.map((r) => r.metodo.id_tipos_de_pago)).toEqual([1, 2]);
    expect(resultado.map((r) => r.precio)).toEqual([1000, 1100]);
  });

  it('devuelve una lista vacia si no hay metodos', () => {
    expect(preciosDeArticuloPorMetodo(1000, [])).toEqual([]);
  });
});
