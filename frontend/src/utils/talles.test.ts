// Tests de utils/talles.ts — el orden de talles de la tabla de venta y de Precios.
//
// La regla que se rompe facil al refactorizar: los talles vacios van SIEMPRE al
// final, sin importar la direccion del orden.
import { describe, it, expect } from 'vitest';
import { valorOrdenTalle, compararTalles } from '@/utils/talles';

describe('valorOrdenTalle', () => {
  it('convierte a numero los talles numericos', () => {
    expect(valorOrdenTalle('2')).toBe(2);
    expect(valorOrdenTalle('22')).toBe(22);
    expect(valorOrdenTalle(' 8 ')).toBe(8);
  });

  it('conserva el string cuando no es numerico', () => {
    expect(valorOrdenTalle('S')).toBe('S');
    expect(valorOrdenTalle('XL')).toBe('XL');
  });

  it('el cero es un talle numerico, no un vacio', () => {
    expect(valorOrdenTalle('0')).toBe(0);
  });

  it('trata como vacio el null y los espacios', () => {
    expect(valorOrdenTalle(null)).toBeNull();
    expect(valorOrdenTalle('')).toBeNull();
    expect(valorOrdenTalle('   ')).toBeNull();
  });
});

describe('compararTalles', () => {
  it('ordena los numericos por valor, no alfabeticamente', () => {
    // El bug que evita: como string, "10" < "2".
    expect(compararTalles('2', '10')).toBeLessThan(0);
    expect(compararTalles('10', '2')).toBeGreaterThan(0);
    expect(compararTalles('4', '4')).toBe(0);
  });

  it('ordena los no numericos alfabeticamente', () => {
    expect(compararTalles('L', 'S')).toBeLessThan(0);
    expect(compararTalles('S', 'L')).toBeGreaterThan(0);
  });

  it('pone los vacios al final en AMBAS direcciones', () => {
    // Invertir el resultado de la comparacion no debe subir los vacios.
    expect(compararTalles(null, '2')).toBeGreaterThan(0);
    expect(compararTalles('2', null)).toBeLessThan(0);
    expect(compararTalles(null, null)).toBe(0);
    expect(compararTalles('', 'S')).toBeGreaterThan(0);
  });

  it('ordena una lista mezclada dejando los vacios al final', () => {
    const ordenados = ['10', null, 'S', '2', '', 'L'].sort(compararTalles);
    expect(ordenados).toEqual(['2', '10', 'L', 'S', null, '']);
  });
});
