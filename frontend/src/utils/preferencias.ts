/**
 * Preferencias de UX por navegador (que pestaña quedo abierta, que modo de
 * edicion se uso la ultima vez). NO es dato de negocio: si el navegador bloquea
 * `localStorage` (modo privado, cookies de terceros deshabilitadas, iframe con
 * storage particionado) el acceso TIRA una excepcion, no devuelve null — por eso
 * todo va envuelto en try/catch y se cae al valor por defecto en silencio.
 */

/**
 * Lee una preferencia validandola contra la lista de valores aceptados: si lo
 * guardado ya no existe (se renombro una opcion, o alguien edito el storage a
 * mano) devuelve `porDefecto` en vez de dejar la UI en un estado imposible.
 */
export function leerPreferencia<T extends string>(
  clave: string,
  valoresValidos: readonly T[],
  porDefecto: T,
): T {
  try {
    const guardado = window.localStorage.getItem(clave);
    if (guardado !== null && (valoresValidos as readonly string[]).includes(guardado)) {
      return guardado as T;
    }
  } catch {
    // Storage bloqueado: se usa el valor por defecto.
  }
  return porDefecto;
}

/** Guarda una preferencia. Si el storage esta bloqueado o lleno, no hace nada. */
export function guardarPreferencia(clave: string, valor: string): void {
  try {
    window.localStorage.setItem(clave, valor);
  } catch {
    // Storage bloqueado o sin cuota: la preferencia simplemente no persiste.
  }
}
