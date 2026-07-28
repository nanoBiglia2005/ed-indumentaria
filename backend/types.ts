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

/**
 * Respuesta de POST /api/remitos: el remito creado mas el resultado de la
 * impresion. La venta se guarda igual aunque la impresora falle, asi que
 * `impresion.status` avisa si hay que reintentar o revisar la impresora.
 */
export type RemitoCreado = RemitoConDetalles & {
  impresion: { status: 'ok' | 'error'; message?: string };
};
