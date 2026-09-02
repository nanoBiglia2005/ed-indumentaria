/**
 * Una impresora del registro, tal como la devuelve GET /api/impresoras.
 * `token_hash` NUNCA sale del backend: el token en claro se ve una sola vez, al
 * crear la impresora o al regenerarlo.
 */
export interface Impresora {
  id_impresora: number;
  nombre: string;
  activa: boolean;
  /** Destino de todo trabajo que no elige impresora (todos los empleados). */
  es_predeterminada: boolean;
  /** Si su printer-client tiene el websocket abierto AHORA. */
  conectada: boolean;
}

/**
 * Lo que necesita una pantalla para ofrecer (o no) la eleccion de impresora.
 *
 * `id_impresora_sugerida` sale del MISMO resolvedor que usa la impresion, asi
 * que lo que se ve preseleccionado es exactamente lo que va a pasar si el
 * usuario no toca nada. `puede_elegir` es cosmetico: si es false el backend
 * ignora igual cualquier id que se mande.
 */
export interface EstadoImpresoras {
  impresoras: Impresora[];
  id_impresora_sugerida: number | null;
  puede_elegir: boolean;
}
