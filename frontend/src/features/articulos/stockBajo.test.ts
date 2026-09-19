// Tests de stockBajo.ts — la regla que pinta de rojo una fila de la tabla de
// articulos. Protege tres decisiones que no se ven en la UI: la comparacion es
// ESTRICTA (igual al minimo no es alerta), un minimo en 0/null desactiva la
// alerta (no "todo articulo con cant 0 esta en rojo"), y una cantidad ausente
// cuenta como 0. Si alguna cambia, la tabla empieza a marcar (o dejar de
// marcar) articulos sin que nadie lo pida.
import { describe, it, expect } from 'vitest';
import { stockBajo, descripcionStockBajo } from '@/features/articulos/stockBajo';

describe('stockBajo', () => {
  it('es true cuando la cantidad esta por debajo del minimo', () => {
    expect(stockBajo({ cant: 2, stock_minimo: 5 })).toBe(true);
    expect(stockBajo({ cant: 0, stock_minimo: 1 })).toBe(true);
  });

  it('es false cuando la cantidad iguala o supera el minimo (comparacion estricta)', () => {
    expect(stockBajo({ cant: 5, stock_minimo: 5 })).toBe(false);
    expect(stockBajo({ cant: 6, stock_minimo: 5 })).toBe(false);
  });

  it('sin minimo configurado (0, null o undefined) nunca hay alerta', () => {
    // Un articulo sin minimo no se controla: cant 0 no lo pone en rojo.
    expect(stockBajo({ cant: 0, stock_minimo: 0 })).toBe(false);
    expect(stockBajo({ cant: 0, stock_minimo: null })).toBe(false);
    expect(stockBajo({ cant: 0, stock_minimo: undefined })).toBe(false);
    // Un minimo negativo tampoco es un minimo.
    expect(stockBajo({ cant: 0, stock_minimo: -3 })).toBe(false);
  });

  it('una cantidad ausente (null/undefined) cuenta como 0', () => {
    expect(stockBajo({ cant: null, stock_minimo: 1 })).toBe(true);
    expect(stockBajo({ cant: undefined, stock_minimo: 1 })).toBe(true);
    // ...y sigue respetando "sin minimo, sin alerta".
    expect(stockBajo({ cant: null, stock_minimo: 0 })).toBe(false);
  });
});

describe('descripcionStockBajo', () => {
  it('devuelve el texto con los dos numeros cuando hay alerta', () => {
    expect(descripcionStockBajo({ cant: 2, stock_minimo: 5 })).toBe(
      'Cantidad por debajo del mínimo (2 < 5)'
    );
    expect(descripcionStockBajo({ cant: null, stock_minimo: 5 })).toBe(
      'Cantidad por debajo del mínimo (0 < 5)'
    );
  });

  it('devuelve null cuando no hay alerta', () => {
    expect(descripcionStockBajo({ cant: 5, stock_minimo: 5 })).toBeNull();
    expect(descripcionStockBajo({ cant: 0, stock_minimo: 0 })).toBeNull();
  });
});
