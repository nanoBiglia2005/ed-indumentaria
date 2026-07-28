import type { Prisma } from './generated/prisma/client';

/**
 * Relaciones que se incluyen al consultar ARTICULOS.
 * `satisfies Prisma.ARTICULOSInclude` valida que las claves existan de verdad
 * en el modelo (si te equivocás en un nombre, TypeScript avisa acá).
 *
 * Debe reflejar el `articulosInclude` que usa el backend en index.js.
 */
export const articulosInclude = {
  COLORES: true,
  TALLES: true,
  TIPOS_DE_MEDIDA: true,
  PROVEEDORES: true,
} as const satisfies Prisma.ARTICULOSInclude;

/**
 * Tipo de un ARTICULO con sus relaciones ya cargadas.
 * Reutilizable en cualquier parte del frontend:
 *   import type { ArticuloConRelaciones } from '../../backend/types';
 */
export type ArticuloConRelaciones = Prisma.ARTICULOSGetPayload<{
  include: typeof articulosInclude;
}>;

/**
 * Relaciones que se incluyen al consultar REMITOS.
 * Debe reflejar el `remitosInclude` que usa el backend en index.js.
 */
export const remitosInclude = {
  DETALLES_REMITO: {
    include: { ARTICULOS: true },
  },
} as const satisfies Prisma.REMITOSInclude;

/**
 * Tipo de un REMITO (venta) con sus detalles y articulos ya cargados.
 */
export type RemitoConDetalles = Prisma.REMITOSGetPayload<{
  include: typeof remitosInclude;
}>;

/** Como se paga un articulo de la venta. */
export type MetodoPago = 'efectivo' | 'tarjeta';

/**
 * Un articulo de la venta con sus dos precios posibles, ya redondeados por el
 * backend. El frontend muestra estos valores tal cual: el redondeo vive en un
 * solo lugar.
 */
export type ItemVenta = {
  id_articulo: number;
  descripcion: string;
  cantidad: number;
  precio_efectivo: number;
  precio_tarjeta: number;
};

/**
 * Respuesta de POST /api/remitos/preparar: estan calculados los precios (y salvo
 * que se pida `imprimir: false`, ya se imprimio el ticket) pero todavia no se
 * registro nada. La venta sigue igual aunque la impresora falle, por eso
 * `impresion.status` viene aparte: 'omitida' es cuando se salteo a proposito.
 */
export type VentaImpresa = {
  items: ItemVenta[];
  recargo_tarjeta: number;
  impresion: { status: 'ok' | 'error' | 'omitida'; message?: string };
};
