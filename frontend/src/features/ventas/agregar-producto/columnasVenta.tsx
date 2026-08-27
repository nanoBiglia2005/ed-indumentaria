import type { LINEAS, TIPOS_DE_PAGO } from '@backend/types';
import type { ArticuloDeVenta } from '@/types/ventas';
import type { ColumnaTabla } from '@/components/tabla/tipos';
import { codigoBarcodeCompleto } from '@/utils/barcode';
import { compararTalles, valorOrdenTalle } from '@/utils/talles';
import { formatearPesos } from '@/utils/formato';

// Medidas historicas de la tabla del modal de venta (mas compacta que la de
// ArticulosPage).
//
// ALTO_LINEA se exporta porque PasoTabla TIENE que aplicarlo como line-height
// del texto de la celda: si no, el navegador usa el suyo (1.5 heredado del
// preflight = 19.5px con el text-[13px] de la grilla), cada linea mide mas de
// lo que se asumio aca y las filas, que van a una altura FIJA por la
// virtualizacion, se desbordan sobre la de abajo.
export const ALTO_LINEA = 18;
const PADDING_VERTICAL_FILA = 16;
const BORDE_FILA = 1;
export const MAX_LINEAS_CELDA = 3;
export const ROW_HEIGHT = MAX_LINEAS_CELDA * ALTO_LINEA + PADDING_VERTICAL_FILA + BORDE_FILA;
export const ANCHO_COL_SELECCION = 44;

/** Desempate del sort: talles numericos cuando se puede (a diferencia de
 *  ArticulosPage, que los ordena alfabeticamente). */
export const desempateTalleVenta = (a: ArticuloDeVenta, b: ArticuloDeVenta) =>
  compararTalles(a.talle, b.talle);

/**
 * Columnas (solo lectura) de la tabla de articulos del wizard de venta.
 *
 * Ademas del precio base hay una columna por cada metodo de pago CON RECARGO:
 * salen de la base, asi que sumar un metodo nuevo agrega su columna sola. El
 * precio de cada metodo lo calcula el backend (`precios_por_metodo`), no se
 * recalcula aca.
 */
export function crearColumnasVenta(
  lineas: LINEAS[],
  metodos: TIPOS_DE_PAGO[] = []
): ColumnaTabla<ArticuloDeVenta>[] {
  const columnasDePago: ColumnaTabla<ArticuloDeVenta>[] = metodos
    // El metodo sin recargo cobra el precio base: su columna seria un duplicado
    // exacto de "Precio".
    .filter((metodo) => metodo.recargo > 0)
    .map((metodo) => {
      const precioDe = (item: ArticuloDeVenta) =>
        item.precios_por_metodo?.[metodo.id_tipos_de_pago] ?? 0;

      // Sin filtroKey/filtro a proposito: es un valor DERIVADO del precio con
      // el recargo del metodo, no una columna de la base, y la tabla filtra y
      // ordena en la base. Ordenar por el daria exactamente el mismo orden que
      // por "Precio", que si es filtrable.
      return {
        header: `Precio ${metodo.nombre_tipo_de_pago}`,
        render: (item) => `${formatearPesos(precioDe(item))}`,
        width: 145,
      };
    });

  return [
    {
      header: 'Código',
      render: (item) => codigoBarcodeCompleto(item.barcode_tail) ?? 'No Asignado',
      extraClassName: (item) => (!codigoBarcodeCompleto(item.barcode_tail) ? 'text-gray-400 text-xs' : ''),
      width: 110,
      filtroKey: 'codigo',
      filtro: { tipo: 'texto' },
      // El codigo se guarda como string pero es un numero: se ordena por su
      // valor numerico para que 100 quede despues de 20 y no antes.
      ordenValor: (item) => {
        const codigo = codigoBarcodeCompleto(item.barcode_tail);
        if (!codigo) return null;
        const numero = Number(codigo);
        return Number.isNaN(numero) ? codigo : numero;
      },
    },
    {
      header: 'Detalle',
      render: (item) => item.descripcion ?? 'Sin Nombre',
      extraClassName: (item) => (!item.descripcion ? 'text-gray-400 text-xs' : ''),
      width: 200,
      filtroKey: 'nombre',
      filtro: { tipo: 'texto' },
    },
    {
      header: 'Talle',
      render: (item) => item.talle ?? 'Sin Talle',
      extraClassName: (item) => (!item.talle ? 'text-gray-400 text-xs' : ''),
      width: 90,
      filtroKey: 'talle',
      filtro: { tipo: 'texto' },
      ordenValor: (item) => valorOrdenTalle(item.talle),
    },
    {
      header: 'Cantidad',
      render: (item) => item.cant,
      width: 120,
      filtroKey: 'cant',
      filtro: { tipo: 'rango', getValor: (item) => item.cant },
    },
    {
      header: 'Precio',
      render: (item) => `${formatearPesos(item.precio)}`,
      width: 110,
      filtroKey: 'precio',
      filtro: { tipo: 'rango', getValor: (item) => item.precio },
    },
    ...columnasDePago,
    {
      header: 'Color/Modelo',
      render: (item) => item.detalle ?? 'Sin Detalle',
      extraClassName: (item) => (!item.detalle ? 'text-gray-400 text-xs' : ''),
      width: 150,
      filtroKey: 'detalle',
      filtro: { tipo: 'texto' },
    },
    {
      header: 'Línea',
      render: (item) => lineas.find((l) => l.id_linea === item.id_linea)?.nombre_linea ?? 'Sin Línea',
      extraClassName: (item) => (item.id_linea === null ? 'text-gray-400 text-xs' : ''),
      width: 110,
      filtroKey: 'linea',
      filtro: {
        tipo: 'seleccion',
        getValores: (item) => {
          const linea = lineas.find((l) => l.id_linea === item.id_linea);
          return linea ? [{ id: linea.id_linea, nombre: linea.nombre_linea }] : [];
        },
      },
    },
    {
      header: 'Subgrupo',
      render: (item) => item.nombre_subgrupo ?? 'Sin Subgrupo',
      extraClassName: (item) => (!item.nombre_subgrupo ? 'text-gray-400 text-xs' : ''),
      width: 150,
      filtroKey: 'subgrupos',
      filtro: {
        tipo: 'seleccion',
        getValores: (item) =>
          item.id_subgrupo !== null && item.nombre_subgrupo
            ? [{ id: item.id_subgrupo, nombre: item.nombre_subgrupo }]
            : [],
      },
    },
  ];
}
