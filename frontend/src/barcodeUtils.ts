/**
 * Divide un codigo de barra ingresado a mano en header (primeros 6 digitos)
 * y tail (el resto). Si el campo esta vacio ambos quedan en null; si tiene
 * 6 digitos o menos, tail queda en null.
 */
export function dividirBarcodeManual(digitos: string): {
  barcode_header: number | null;
  barcode_tail: number | null;
} {
  const limpio = digitos.trim();
  if (limpio === '') return { barcode_header: null, barcode_tail: null };

  const headerStr = limpio.slice(0, 6);
  const tailStr = limpio.slice(6);

  return {
    barcode_header: headerStr === '' ? null : parseInt(headerStr, 10),
    barcode_tail: tailStr === '' ? null : parseInt(tailStr, 10),
  };
}

/**
 * Codigo a enviar para que el trigger `asignar_proximo_numero` de la base
 * genere el proximo barcode_tail automaticamente (ver backend/index.js).
 */
export const BARCODE_AUTOMATICO = { barcode_header: null, barcode_tail: -1 } as const;

/** Junta header y tail en un solo string para mostrar o editar como texto. */
export function combinarBarcode(
  header: number | null | undefined,
  tail: number | null | undefined
): string {
  return `${header ?? ''}${tail ?? ''}`;
}
