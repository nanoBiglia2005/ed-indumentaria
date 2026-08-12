import type { Prisma } from './generated/prisma/client';
import ventas from './shared/ventas.json';

/**
 * FACHADA de tipos del backend para el frontend.
 *
 * El frontend importa SOLO de este archivo (alias `@backend/types`): los tipos
 * de Prisma se re-exportan desde aca para que ningun componente dependa
 * directo de `generated/prisma` (artefacto gitignoreado que se regenera con
 * `npm run db:sync` / `prisma generate`).
 */
export type {
  ARTICULOS,
  CLIENTES,
  GRUPOS_DE_VENTA,
  SUBGRUPOS_DE_VENTA,
  LINEAS,
  TIPOS_DE_PAGO,
  GRUPOS_X_LINEAS,
  ARTICULOS_X_GRUPO_VENTA,
  ARTICULOS_X_CLIENTE,
} from './generated/prisma/client';

/**
 * Relaciones que se incluyen al consultar REMITOS.
 * Debe reflejar el `remitosInclude` que usa el backend en services/remitos.js.
 * (Se duplica a proposito: aca hace falta a nivel de TIPOS, con literales
 * `true` para REMITOSGetPayload; alla es el objeto runtime de Prisma.)
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

/** Estados de la tabla ESTADOS_REMITOS. Fuente unica: shared/ventas.json
 *  (el backend CommonJS los lee via constants/ventas.js). */
export const ESTADO_CONFIRMADO = ventas.ESTADOS.CONFIRMADO;
export const ESTADO_FACTURADO = ventas.ESTADOS.FACTURADO;
export const ESTADO_ANULADO = ventas.ESTADOS.ANULADO;
export const ESTADO_DEVUELTO = ventas.ESTADOS.DEVUELTO;

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
