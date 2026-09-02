// Tests de utils/impresoras.ts
//
// QUE REGLA PROTEGEN: lo primero de la lista tiene que ser siempre lo que
// conviene elegir. Quien vende no es tecnico y va a tomar la primera opcion sin
// leer el estado; si una impresora desactivada o desconectada pudiera quedar
// arriba, el ticket se perderia sin que nadie lo note hasta que falte.
import { describe, expect, test } from 'vitest';
import { colorEstadoImpresora, estadoImpresora, ordenarImpresoras } from './impresoras';
import type { Impresora } from '@/types/impresoras';

const impresora = (parcial: Partial<Impresora> & { nombre: string }): Impresora => ({
  id_impresora: 1,
  activa: true,
  es_predeterminada: false,
  conectada: true,
  ...parcial,
});

describe('ordenarImpresoras', () => {
  test('pone la predeterminada primero', () => {
    const orden = ordenarImpresoras([
      impresora({ id_impresora: 1, nombre: 'Deposito' }),
      impresora({ id_impresora: 2, nombre: 'Mostrador', es_predeterminada: true }),
    ]);

    expect(orden.map((item) => item.nombre)).toEqual(['Mostrador', 'Deposito']);
  });

  test('deja las desactivadas al final, incluso antes que la predeterminada', () => {
    // El ABM impide desactivar la predeterminada, pero si por algun camino
    // pasara, "desactivada" pesa mas: no se puede imprimir ahi.
    const orden = ordenarImpresoras([
      impresora({ id_impresora: 1, nombre: 'Vieja', activa: false, es_predeterminada: true }),
      impresora({ id_impresora: 2, nombre: 'Mostrador' }),
    ]);

    expect(orden.map((item) => item.nombre)).toEqual(['Mostrador', 'Vieja']);
  });

  test('entre activas, las conectadas van antes que las desconectadas', () => {
    const orden = ordenarImpresoras([
      impresora({ id_impresora: 1, nombre: 'Apagada', conectada: false }),
      impresora({ id_impresora: 2, nombre: 'Prendida' }),
    ]);

    expect(orden.map((item) => item.nombre)).toEqual(['Prendida', 'Apagada']);
  });

  test('desempata por nombre', () => {
    const orden = ordenarImpresoras([
      impresora({ id_impresora: 1, nombre: 'Zapatos' }),
      impresora({ id_impresora: 2, nombre: 'Accesorios' }),
    ]);

    expect(orden.map((item) => item.nombre)).toEqual(['Accesorios', 'Zapatos']);
  });

  test('no muta el array que recibe', () => {
    const original = [
      impresora({ id_impresora: 1, nombre: 'Deposito' }),
      impresora({ id_impresora: 2, nombre: 'Mostrador', es_predeterminada: true }),
    ];
    const copia = [...original];

    ordenarImpresoras(original);

    expect(original).toEqual(copia);
  });
});

describe('estadoImpresora', () => {
  test('desactivada gana sobre conectada', () => {
    // Una impresora desactivada con el cliente todavia conectado no puede
    // figurar "En linea": no va a recibir trabajos.
    expect(estadoImpresora(impresora({ nombre: 'X', activa: false, conectada: true }))).toBe(
      'Desactivada'
    );
    expect(colorEstadoImpresora(impresora({ nombre: 'X', activa: false }))).toBe('bg-gray-300');
  });

  test('activa pero sin cliente conectado avisa en ambar', () => {
    expect(estadoImpresora(impresora({ nombre: 'X', conectada: false }))).toBe('Sin conexión');
    expect(colorEstadoImpresora(impresora({ nombre: 'X', conectada: false }))).toBe('bg-amber-500');
  });

  test('activa y conectada esta en linea', () => {
    expect(estadoImpresora(impresora({ nombre: 'X' }))).toBe('En línea');
    expect(colorEstadoImpresora(impresora({ nombre: 'X' }))).toBe('bg-green-500');
  });
});
