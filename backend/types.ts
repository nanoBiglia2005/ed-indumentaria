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

/** Estados de la tabla ESTADOS_REMITOS. */
export const ESTADO_CONFIRMADO = 1;
export const ESTADO_FACTURADO = 2;
export const ESTADO_ANULADO = 3;
export const ESTADO_DEVUELTO = 4;

/**
 * Respuesta de POST /api/remitos: el remito ya quedo guardado como CONFIRMADO
 * (pendiente de cobro). La venta se registra igual aunque la impresora falle,
 * por eso `impresion.status` viene aparte: 'omitida' es cuando se salteo a
 * proposito con el boton "Sin Imprimir".
 */
export type RemitoCreado = RemitoConDetalles & {
  impresion: { status: 'ok' | 'error' | 'omitida'; message?: string };
};

/**
 * Una linea de un remito pendiente con sus dos precios posibles, ya redondeados
 * por el backend. El frontend muestra estos valores tal cual: el redondeo vive
 * en un solo lugar. Se identifica por `id_detalle` (la fila de DETALLES_REMITO).
 */
export type ItemPago = {
  id_detalle: number;
  descripcion: string;
  cantidad: number;
  precio_efectivo: number;
  precio_tarjeta: number;
};

/** Respuesta de GET /api/remitos/:id/opciones-pago. */
export type OpcionesDePago = {
  items: ItemPago[];
  recargo_tarjeta: number;
};
