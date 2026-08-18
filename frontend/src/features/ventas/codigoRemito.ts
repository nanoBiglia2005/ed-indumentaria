/**
 * Codigo con el que se identifica un remito EN PANTALLA: el mes de la venta
 * (siempre con dos digitos) y el numero correlativo de ese mes, que asigna el
 * trigger trg_cod_remito_final de la base a partir de remitos_contador.
 *
 * Es solo para mostrar: internamente los remitos se siguen identificando con
 * id_remito (que es lo que viaja en las URLs de la API).
 *
 * Devuelve null si el remito todavia no tiene numero (los remitos anteriores al
 * trigger no lo tienen), para que quien lo muestre decida el reemplazo.
 */
export const codigoRemito = (
  cod_mes: number | null | undefined,
  cod_remito_final: number | null | undefined
): string | null => {
  if (cod_remito_final === null || cod_remito_final === undefined) return null;

  const mes = String(cod_mes ?? 0).padStart(2, '0');
  return `${mes}-${cod_remito_final}`;
};
