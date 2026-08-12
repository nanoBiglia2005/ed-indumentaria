// Tipos del dominio de agrupaciones (Configuracion).

export type TipoAgrupacion = 'grupo' | 'subgrupo' | 'colegio' | 'linea';

/** Si se pasa a CrearAgrupacionModal, edita ese registro en vez de crear uno. */
export interface EdicionAgrupacion {
  id: number;
  nombre: string;
  idGrupo?: number | null;
  tipoCliente?: 1 | 2;
}
