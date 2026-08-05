/** Cantidad maxima de digitos que puede tener un codigo de barra completo
 * (header + tail), en linea con los limites `@db.VarChar(6)` / `@db.VarChar(20)`
 * de la base. */
export const BARCODE_HEADER_MAX = 6;
export const BARCODE_TAIL_MAX = 20;
export const BARCODE_MAX = BARCODE_HEADER_MAX + BARCODE_TAIL_MAX;

/**
 * Divide un codigo de barra ingresado a mano en header (primeros 6 digitos)
 * y tail (el resto). Si el campo esta vacio ambos quedan en null; si tiene
 * 6 digitos o menos, tail queda en null.
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
 * genere el proximo barcode_tail automaticamente (ver backend/index.js).
 */
export const BARCODE_AUTOMATICO = { barcode_header: null, barcode_tail: '-1' } as const;

/** Junta header y tail en un solo string para mostrar o editar como texto. */
export function combinarBarcode(
  header: string | null | undefined,
  tail: string | null | undefined
): string {
  return `${header ?? ''}${tail ?? ''}`;
}
