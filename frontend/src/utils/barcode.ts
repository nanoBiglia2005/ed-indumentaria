// El limite de digitos tiene una unica fuente, shared/barcode.json: el backend
// usa el MISMO valor en SQL para filtrar/ordenar la columna Codigo (ver
// lib/articulosConsulta.js) y para validar el codigo escaneado (ver
// routes/venta.js). Si aca se duplicara el valor y cambiara de un lado,
// los dos dejarian de coincidir.
import { BARCODE_MAX } from '@backend/types';

export { BARCODE_MAX };

/**
 * Codigo a enviar para que el trigger `asignar_proximo_numero` de la base
 * genere el proximo barcode_tail automaticamente (ver backend).
 */
export const BARCODE_AUTOMATICO = { barcode_tail: '-1' } as const;

/**
 * Codigo de barras para MOSTRAR: el valor de barcode_tail tal cual, o null si
 * el articulo no tiene ninguno cargado.
 */
export function codigoBarcodeCompleto(tail: string | null | undefined): string | null {
  return tail || null;
}
