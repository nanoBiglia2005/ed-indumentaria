import { useMemo } from 'react';
import type { GRUPOS_DE_VENTA } from '@backend/types';
import ListaSeleccionable from '@/components/ui/ListaSeleccionable';

/** Paso 3 del wizard: elegir un grupo con articulos del cliente en esa linea. */
export default function PasoGrupo({
  grupos,
  cargando,
  nombreCliente,
  nombreLinea,
  onSeleccionar,
  onSeleccionarTodos,
}: {
  grupos: GRUPOS_DE_VENTA[];
  cargando: boolean;
  nombreCliente: string | undefined;
  nombreLinea: string | undefined;
  onSeleccionar: (grupo: GRUPOS_DE_VENTA) => void;
  /** Saltea el filtro de grupo: se venden articulos de todos. */
  onSeleccionarTodos: () => void;
}) {
  const opciones = useMemo(
    () => grupos.map((g) => ({ id: g.id_grupo, nombre: g.nombre_grupo })),
    [grupos]
  );

  // La lista trabaja con {id, nombre}; el que elige espera el GRUPOS_DE_VENTA
  // entero, asi que se resuelve de vuelta por id.
  const porId = useMemo(() => new Map(grupos.map((g) => [g.id_grupo, g])), [grupos]);

  return (
    <ListaSeleccionable
      opciones={opciones}
      cargando={cargando}
      mensajeCargando='Cargando grupos...'
      mensajeVacio={
        <>
          {nombreCliente} no tiene artículos vigentes de {nombreLinea}.
        </>
      }
      placeholder='Buscar grupo...'
      opcionTodos={{ nombre: 'No filtrar por grupo', onSeleccionar: onSeleccionarTodos }}
      onSeleccionar={(opcion) => {
        const grupo = porId.get(opcion.id);
        if (grupo) onSeleccionar(grupo);
      }}
    />
  );
}
