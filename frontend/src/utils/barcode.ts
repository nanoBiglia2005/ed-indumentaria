// El prefijo generico y los limites de digitos tienen una unica fuente,
// shared/barcode.json: el backend arma el MISMO codigo completo en SQL para
// filtrar y ordenar la columna Codigo, asi que si aca se duplicaran los valores
// y uno de los dos cambiara, buscar por codigo dejaria de encontrar.
import { BARCODE_HEADER_GENERICO, BARCODE_HEADER_MAX, BARCODE_TAIL_MAX } from '@backend/types';

export { BARCODE_HEADER_GENERICO, BARCODE_HEADER_MAX, BARCODE_TAIL_MAX };

/** Cantidad maxima de digitos que puede tener un codigo de barra completo. */
export const BARCODE_MAX = BARCODE_HEADER_MAX + BARCODE_TAIL_MAX;

/**
 * Divide un codigo de barra ingresado a mano en header (los primeros
 * BARCODE_HEADER_MAX digitos) y tail (el resto). Si el campo esta vacio ambos
 * quedan en null; si no supera el largo del header, tail queda en null.
 */
export function dividirBarcodeManual(digitos: string): {
  barcode_header: string | null;
  barcode_tail: string | null;
} {
  const limpio = digitos.trim().slice(0, BARCODE_MAX);
  if (limpio === '') return { barcode_header: null, barcode_tail: null };

  const headerStr = limpio.slice(0, BARCODE_HEADER_MAX);
  const tailStr = limpio.slice(BARCODE_HEADER_MAX);

  return {
    barcode_header: headerStr === '' ? null : headerStr,
    barcode_tail: tailStr === '' ? null : tailStr,
  };
}

/**
 * Codigo a enviar para que el trigger `asignar_proximo_numero` de la base
 * genere el proximo barcode_tail automaticamente (ver backend).
 */
export const BARCODE_AUTOMATICO = { barcode_header: null, barcode_tail: '-1' } as const;

/** Junta header y tail en un solo string para mostrar o editar como texto. */
export function combinarBarcode(
  header: string | null | undefined,
  tail: string | null | undefined
): string {
  return `${header ?? ''}${tail ?? ''}`;
}

/**
 * Codigo de barras completo para MOSTRAR: si el articulo no tiene header
 * propio se antepone BARCODE_HEADER_GENERICO (igual que hace la base al
 * imprimir). Devuelve null si no hay ningun dato de barcode.
 * El backend replica esta misma logica en SQL (lib/articulosConsulta.js) para
 * que el filtro y el orden por Codigo coincidan con lo que se ve.
 */
export function codigoBarcodeCompleto(
  header: string | null | undefined,
  tail: string | null | undefined
): string | null {
  return header
    ? tail
      ? header + tail
      : header
    : tail
    ? BARCODE_HEADER_GENERICO + tail
    : null;
}
