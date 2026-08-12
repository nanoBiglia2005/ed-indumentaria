import type { LINEAS } from '@backend/types';
import type { ArticuloDeVenta } from '@/types/ventas';
import type { ColumnaTabla } from '@/components/tabla/tipos';
import { codigoBarcodeCompleto } from '@/utils/barcode';

// Medidas historicas de la tabla del modal de venta (mas compacta que la de
// ArticulosPage).
const ALTO_LINEA = 18;
const PADDING_VERTICAL_FILA = 16;
const BORDE_FILA = 1;
export const MAX_LINEAS_CELDA = 3;
export const ROW_HEIGHT = MAX_LINEAS_CELDA * ALTO_LINEA + PADDING_VERTICAL_FILA + BORDE_FILA;
export const ANCHO_COL_SELECCION = 44;

/**
 * Convierte un talle a numero cuando se puede: "1" < "2" < "22" en vez del
 * orden alfabetico ("10" < "2" para un string). No todos los talles son
 * numericos (S, M, L, ...), asi que se conserva el string cuando no se puede.
 */
export function valorOrdenTalle(talle: string | null): string | number | null {
  if (!talle) return null;
  const recortado = talle.trim();
  if (recortado === '') return null;
  const numero = Number(recortado);
  return Number.isNaN(numero) ? recortado : numero;
}

/** Desempate del sort: talles numericos cuando se puede (a diferencia de
 *  ArticulosPage, que los ordena alfabeticamente). */
export const desempateTalleVenta = (a: ArticuloDeVenta, b: ArticuloDeVenta) => {
  const talleA = valorOrdenTalle(a.talle);
  const talleB = valorOrdenTalle(b.talle);
  if (talleA === null && talleB === null) return 0;
  if (talleA === null || talleB === null) return talleA === null ? 1 : -1;
  return typeof talleA === 'number' && typeof talleB === 'number'
    ? talleA - talleB
    : String(talleA).localeCompare(String(talleB));
};

/** Las 8 columnas (solo lectura) de la tabla de articulos del wizard de venta. */
export function crearColumnasVenta(lineas: LINEAS[]): ColumnaTabla<ArticuloDeVenta>[] {
  return [
    {
      header: 'Código',
      render: (item) => codigoBarcodeCompleto(item.barcode_header, item.barcode_tail) ?? 'No Asignado',
      extraClassName: (item) =>
        !codigoBarcodeCompleto(item.barcode_header, item.barcode_tail) ? 'text-gray-400 text-xs' : '',
      width: 120,
      filtroKey: 'codigo',
      filtro: { tipo: 'texto' },
      // El codigo se guarda como string pero es un numero: se ordena por su
      // valor numerico para que 100 quede despues de 20 y no antes.
      ordenValor: (item) => {
        const codigo = codigoBarcodeCompleto(item.barcode_header, item.barcode_tail);
        if (!codigo) return null;
        const numero = Number(codigo);
        return Number.isNaN(numero) ? codigo : numero;
      },
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
      filtroKey: 'subgrupo',
      filtro: {
        tipo: 'seleccion',
        getValores: (item) =>
          item.id_subgrupo !== null && item.nombre_subgrupo
            ? [{ id: item.id_subgrupo, nombre: item.nombre_subgrupo }]
            : [],
      },
    },
    {
      header: 'Color/Modelo',
      render: (item) => item.detalle ?? 'Sin Detalle',
      extraClassName: (item) => (!item.detalle ? 'text-gray-400 text-xs' : ''),
      width: 150,
      filtroKey: 'detalle',
      filtro: { tipo: 'texto' },
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
      width: 95,
      filtroKey: 'cant',
      filtro: { tipo: 'rango', getValor: (item) => item.cant },
    },
    {
      header: 'Precio',
      render: (item) => `${item.precio}$`,
      width: 110,
      filtroKey: 'precio',
      filtro: { tipo: 'rango', getValor: (item) => item.precio },
    },
  ];
}
