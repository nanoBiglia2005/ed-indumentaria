// Cuentas del cobro de un remito.
//
// ESPEJO de backend/services/preciosPorMetodo.js y pagosRemito.js: la pantalla
// muestra estos numeros y el backend los vuelve a calcular antes de guardarlos
// (no confia en los que le manda el navegador). Si cambia una formula, cambiar
// la otra o se mostraria un importe y se cobraria otro.
import type { ImportesPorMetodo, TIPOS_DE_PAGO } from '@backend/types';
import { redondearPrecio, precioConRecargo } from '@/utils/precios';

/** La vuelta: cuanto de la venta cubre un importe cobrado con ese metodo. */
export const montoInicialDesdeFinal = (montoFinal: number, recargo: number) =>
  redondearPrecio(montoFinal / (1 + recargo / 100));

/**
 * Total de un conjunto de lineas con cada metodo. Se redondea LINEA POR LINEA y
 * despues se suma, que es lo que hace que el ticket cierre cuando se suman los
 * renglones a mano.
 */
export const totalesDeLineas = (
  lineas: { precios_por_metodo: ImportesPorMetodo; cantidad: number }[],
  metodos: TIPOS_DE_PAGO[]
): ImportesPorMetodo =>
  Object.fromEntries(
    metodos.map((metodo) => [
      metodo.id_tipos_de_pago,
      lineas.reduce(
        (total, linea) => total + (linea.precios_por_metodo[metodo.id_tipos_de_pago] ?? 0) * linea.cantidad,
        0
      ),
    ])
  );

/**
 * Reparto sugerido de lo que falta cubrir entre los metodos que quedaron
 * vacios. Es solo el placeholder: si la division no es exacta, el resto va al
 * metodo de menor id (el primero de la tabla), asi la suma de las sugerencias
 * da SIEMPRE el restante y aceptarlas todas cierra el pago.
 */
export const repartirEntreVacios = (restante: number, idsVacios: number[]) => {
  const reparto = new Map<number, number>();
  if (idsVacios.length === 0) return reparto;

  const ordenados = [...idsVacios].sort((a, b) => a - b);
  const total = Math.max(0, Math.round(restante));
  const base = Math.floor(total / ordenados.length);
  const resto = total - base * ordenados.length;

  ordenados.forEach((id, indice) => reparto.set(id, indice === 0 ? base + resto : base));
  return reparto;
};

/**
 * Cuanto se cobra por un metodo al que se le imputo `montoInicial`.
 *
 * REGLA DEL METODO UNICO: si ese metodo se lleva TODA la venta, se cobra el
 * total de la venta para ese metodo (la suma de sus lineas ya redondeadas), que
 * es el mismo numero que muestra su boton. Si no fuera asi, poner el 100% en un
 * metodo desde el reparto daria distinto que elegirlo con el boton, porque
 * redondear linea por linea y redondear el total no dan lo mismo.
 *
 * Repartido entre dos o mas metodos no hay con que comparar (una parte suelta
 * no se corresponde con ningun articulo), asi que se le aplica el recargo.
 */
export const montoACobrar = ({
  montoInicial,
  recargo,
  esMetodoUnico,
  totalDelMetodo,
}: {
  montoInicial: number;
  recargo: number;
  esMetodoUnico: boolean;
  totalDelMetodo: number | undefined;
}) =>
  esMetodoUnico && totalDelMetodo !== undefined
    ? totalDelMetodo
    : precioConRecargo(montoInicial, recargo);

/** Lo tipeado, sin nada que no sea un digito (los importes son enteros). */
export const soloDigitos = (valor: string) => valor.replace(/\D/g, '');
