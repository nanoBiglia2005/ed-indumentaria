// Pasos del modal "Imprimir Reporte": Linea -> Grupo -> Subgrupo -> Colegio/Club.
//
// Con la linea elegida llegan TODAS las combinaciones que tienen articulos
// (GET /api/reportes/opciones); cada paso siguiente ofrece solo lo que existe
// con lo ya elegido, asi ningun camino termina en un reporte vacio.
import type { Opcion } from '@/types/comunes';
import type { CombinacionReporte } from '@/types/reportes';

/** Sin repetidos y por nombre, para que la lista sea facil de recorrer. */
const opcionesUnicas = (opciones: Opcion[]): Opcion[] =>
  [...new Map(opciones.map((opcion) => [opcion.id, opcion])).values()].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es')
  );

export const gruposDelRecorrido = (combinaciones: CombinacionReporte[]) =>
  opcionesUnicas(combinaciones.map((c) => ({ id: c.id_grupo, nombre: c.grupo })));

export const subgruposDelRecorrido = (combinaciones: CombinacionReporte[], idGrupo: number) =>
  opcionesUnicas(
    combinaciones.filter((c) => c.id_grupo === idGrupo).map((c) => ({ id: c.id_subgrupo, nombre: c.subgrupo }))
  );

/** Los Colegios/Clubes con articulos en ese subgrupo (los "sin" no son una opcion puntual). */
export const colegiosDelRecorrido = (combinaciones: CombinacionReporte[], idGrupo: number, idSubgrupo: number) =>
  opcionesUnicas(
    combinaciones
      .filter((c) => c.id_grupo === idGrupo && c.id_subgrupo === idSubgrupo && c.id_cliente !== null)
      .map((c) => ({ id: c.id_cliente as number, nombre: c.colegio_club ?? `Colegio/Club #${c.id_cliente}` }))
  );

/**
 * Cuantos articulos va a tener el reporte. `idCliente` null = todos los
 * Colegios/Clubes, incluidos los articulos sin ninguno (igual que el backend).
 */
export const articulosDelRecorrido = (
  combinaciones: CombinacionReporte[],
  idGrupo: number,
  idSubgrupo: number,
  idCliente: number | null
) =>
  combinaciones
    .filter(
      (c) =>
        c.id_grupo === idGrupo && c.id_subgrupo === idSubgrupo && (idCliente === null || c.id_cliente === idCliente)
    )
    .reduce((total, c) => total + c.articulos, 0);
