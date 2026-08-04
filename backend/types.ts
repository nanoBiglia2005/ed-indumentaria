import type { Prisma } from './generated/prisma/client';

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
