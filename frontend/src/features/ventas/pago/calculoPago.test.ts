// Tests de calculoPago.ts — las cuentas del cobro que ve el usuario.
//
// Es el ESPEJO de backend/services/pagosRemito.js: la pantalla muestra estos
// numeros y el backend los vuelve a calcular antes de guardar. Si una formula
// cambia de un lado y no del otro, se muestra un importe y se cobra otro.
import { describe, it, expect } from 'vitest';
import type { TIPOS_DE_PAGO } from '@backend/types';
import {
  montoInicialDesdeFinal,
  totalesDeLineas,
  repartirEntreVacios,
  esMetodoUnico,
  montoACobrar,
  soloDigitos,
} from '@/features/ventas/pago/calculoPago';

const metodo = (id: number, recargo: number) =>
  ({ id_tipos_de_pago: id, nombre_tipo_de_pago: `M${id}`, recargo }) as TIPOS_DE_PAGO;

const EFECTIVO = metodo(1, 0);
const TARJETA = metodo(2, 10);

describe('montoInicialDesdeFinal', () => {
  it('deshace el recargo', () => {
    expect(montoInicialDesdeFinal(1100, 10)).toBe(1000);
    expect(montoInicialDesdeFinal(1000, 0)).toBe(1000);
  });

  it('redondea al ENTERO, no a la decena', () => {
    // Con la decena, todo lo tipeado entre 8769 y 8780 caia en el mismo monto
    // inicial (7500): el reparto cerraba en 0 restante con un importe que no era
    // el que se iba a cobrar, y al salir del campo el numero saltaba solo.
    expect(montoInicialDesdeFinal(8775, 17)).toBe(7500);
    expect(montoInicialDesdeFinal(8770, 17)).toBe(7496);
  });

  it('desde un monto inicial el ida y vuelta SI es exacto', () => {
    // Al dividir, el error del redondeo se achica (nunca llega a medio peso), asi
    // que volver siempre cae en el mismo inicial. Es lo que hace que escribir en
    // una columna de la tabla y leer la otra sea coherente. Con el redondeo a la
    // decena esto NO valia.
    for (const inicial of [7500, 7501, 999, 12345]) {
      const final = montoACobrar({
        montoInicial: inicial,
        recargo: 17,
        esMetodoUnico: false,
        totalDelMetodo: undefined,
      });

      expect(montoInicialDesdeFinal(final, 17)).toBe(inicial);
    }
  });

  it('desde un monto final tipeado NO siempre lo es: por eso el campo se acomoda', () => {
    // 8772 -> 7497 -> 8771. Multiplicar SI amplifica el error del redondeo, asi
    // que hay importes que no se pueden cobrar exactos: al salir del campo se
    // reemplazan por el que de verdad corresponde al monto inicial derivado.
    expect(montoInicialDesdeFinal(8772, 17)).toBe(7497);
    expect(
      montoACobrar({ montoInicial: 7497, recargo: 17, esMetodoUnico: false, totalDelMetodo: undefined })
    ).toBe(8771);
  });
});

describe('totalesDeLineas', () => {
  it('suma las lineas ya redondeadas por cada metodo', () => {
    const lineas = [
      { precios_por_metodo: { 1: 1000, 2: 1100 }, cantidad: 2 },
      { precios_por_metodo: { 1: 500, 2: 550 }, cantidad: 1 },
    ];

    expect(totalesDeLineas(lineas, [EFECTIVO, TARJETA])).toEqual({ 1: 2500, 2: 2750 });
  });

  it('trata un metodo faltante en una linea como 0', () => {
    const lineas = [{ precios_por_metodo: { 1: 1000 }, cantidad: 1 }];
    expect(totalesDeLineas(lineas, [EFECTIVO, TARJETA])).toEqual({ 1: 1000, 2: 0 });
  });

  it('devuelve 0 por metodo si no hay lineas', () => {
    expect(totalesDeLineas([], [EFECTIVO, TARJETA])).toEqual({ 1: 0, 2: 0 });
  });
});

describe('repartirEntreVacios', () => {
  it('INVARIANTE: la suma del reparto siempre da el restante', () => {
    // Es la razon de ser de la funcion: aceptar todas las sugerencias tiene que
    // cerrar el pago exacto, sin importar si la division es entera.
    for (const restante of [0, 1, 7, 100, 1000, 1001, 99999]) {
      for (const cantidad of [1, 2, 3, 4, 7]) {
        const ids = Array.from({ length: cantidad }, (_, i) => i + 1);
        const reparto = repartirEntreVacios(restante, ids);
        const suma = [...reparto.values()].reduce((a, b) => a + b, 0);

        expect(suma).toBe(restante);
      }
    }
  });

  it('el resto de la division va al metodo de menor id', () => {
    const reparto = repartirEntreVacios(100, [3, 1, 2]);

    // 100 / 3 = 33 con resto 1 -> el id 1 se lleva 34.
    expect(reparto.get(1)).toBe(34);
    expect(reparto.get(2)).toBe(33);
    expect(reparto.get(3)).toBe(33);
  });

  it('devuelve un reparto vacio si no hay metodos vacios', () => {
    expect(repartirEntreVacios(1000, []).size).toBe(0);
  });

  it('nunca reparte montos negativos', () => {
    const reparto = repartirEntreVacios(-500, [1, 2]);
    expect([...reparto.values()]).toEqual([0, 0]);
  });
});

describe('esMetodoUnico', () => {
  it('pide que el metodo cubra TODA la venta, no que sea la unica fila cargada', () => {
    // El bug que motivo el test: con 62000 de venta, tipear 1 en una fila y dejar
    // el resto vacio activaba la regla y mostraba el total entero de ese metodo.
    expect(esMetodoUnico([1, 0], 62000)).toBe(false);
    expect(esMetodoUnico([62000, 0], 62000)).toBe(true);
  });

  it('con el reparto entre varios metodos no aplica', () => {
    expect(esMetodoUnico([17500, 7500], 25000)).toBe(false);
  });

  it('sin ningun monto cargado no aplica', () => {
    expect(esMetodoUnico([0, 0], 62000)).toBe(false);
  });
});

describe('montoACobrar (regla del metodo unico)', () => {
  it('con un solo metodo cobra el total ya congelado de la venta', () => {
    // El mismo numero que muestra el boton del metodo. Notar que 1130 NO es
    // 1000 * 1.1: viene de sumar las lineas ya redondeadas.
    expect(
      montoACobrar({ montoInicial: 1000, recargo: 10, esMetodoUnico: true, totalDelMetodo: 1130 })
    ).toBe(1130);
  });

  it('repartido entre varios aplica el recargo a cada parte', () => {
    expect(
      montoACobrar({ montoInicial: 500, recargo: 10, esMetodoUnico: false, totalDelMetodo: 1130 })
    ).toBe(550);
  });

  it('el monto final se redondea al ENTERO, sin forzar multiplos de 10', () => {
    // Una parte suelta del reparto no es el precio de ningun articulo, asi que no
    // va a la decena. El backend hace lo mismo (pagosRemito.js pasa final = true):
    // si divergieran, se mostraria 8775 y se cobraria 8780.
    expect(
      montoACobrar({
        montoInicial: 7500,
        recargo: 17,
        esMetodoUnico: false,
        totalDelMetodo: undefined,
      })
    ).toBe(8775);
  });

  it('metodo unico sin total conocido cae al recargo sobre el monto', () => {
    expect(
      montoACobrar({
        montoInicial: 1000,
        recargo: 10,
        esMetodoUnico: true,
        totalDelMetodo: undefined,
      })
    ).toBe(1100);
  });
});

describe('soloDigitos', () => {
  it('deja unicamente los digitos', () => {
    expect(soloDigitos('1.234,56')).toBe('123456');
    expect(soloDigitos('$ 1 000')).toBe('1000');
    expect(soloDigitos('abc')).toBe('');
    expect(soloDigitos('')).toBe('');
  });
});
