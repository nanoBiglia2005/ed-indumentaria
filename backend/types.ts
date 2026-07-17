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
