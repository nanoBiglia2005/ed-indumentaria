import { useMemo } from 'react';
import type { LINEAS } from '@backend/types';
import ListaSeleccionable from '@/components/ui/ListaSeleccionable';

/** Paso 1 del wizard: elegir la linea de la que se va a vender. */
export default function PasoLinea({
  lineas,
  cargando,
  onSeleccionar,
  onSeleccionarTodas,
}: {
  lineas: LINEAS[];
  cargando: boolean;
  onSeleccionar: (linea: LINEAS) => void;
  /** Saltea el filtro de linea: se venden articulos de todas. */
  onSeleccionarTodas: () => void;
}) {
  const opciones = useMemo(
    () => lineas.map((l) => ({ id: l.id_linea, nombre: l.nombre_linea })),
    [lineas]
  );

  // La lista trabaja con {id, nombre}; el que elige espera la LINEAS entera,
  // asi que se resuelve de vuelta por id.
  const porId = useMemo(() => new Map(lineas.map((l) => [l.id_linea, l])), [lineas]);

  return (
    <ListaSeleccionable
      opciones={opciones}
      cargando={cargando}
      mensajeCargando='Cargando líneas...'
      mensajeVacio='No hay líneas cargadas.'
      placeholder='Buscar línea...'
      opcionTodos={{ nombre: 'No filtrar por Linea', onSeleccionar: onSeleccionarTodas }}
      onSeleccionar={(opcion) => {
        const linea = porId.get(opcion.id);
        if (linea) onSeleccionar(linea);
      }}
    />
  );
}
