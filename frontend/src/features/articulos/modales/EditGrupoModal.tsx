import { useState, useEffect, useMemo } from 'react';
import type { ARTICULOS, GRUPOS_DE_VENTA, SUBGRUPOS_DE_VENTA } from '@backend/types';
import { ID_GRUPO_NO_ASIGNADO } from '@backend/types';
import BaseModal from '@/components/ui/BaseModal';
import { useAccionAsync } from '@/hooks/useAccionAsync';
import { actualizarArticulo } from '@/api/articulos';
import { mensajeDetallesPrimero } from '@/api/cliente';
import InlineFilterDropdown from '@/components/ui/InlineFilterDropdown';

interface EditGrupoModalProps {
  abierto: boolean;
  onCerrar: () => void;
  onExito: () => void;
  articulo: ARTICULOS | null;
  grupos: GRUPOS_DE_VENTA[];
  subgrupos: SUBGRUPOS_DE_VENTA[];
}

/**
 * Cambia el grupo del articulo. El articulo pertenece siempre a un grupo, asi
 * que no se agrega ni se quita: se reemplaza por otro. El grupo "No Asignado"
 * no se ofrece (solo lo pone la base al eliminarse un grupo).
 */
export default function EditGrupoModal({
  abierto,
  onCerrar,
  onExito,
  articulo,
  grupos,
  subgrupos,
}: EditGrupoModalProps) {
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<number | null>(null);
  const { cargando, error, setError, ejecutar } = useAccionAsync({
    mensajeDe: (err) => mensajeDetallesPrimero(err, 'No se pudo actualizar el grupo del artículo.'),
  });

  useEffect(() => {
    if (!abierto || !articulo) return;
    setGrupoSeleccionado(articulo.id_grupo);
    setError(null);
  }, [abierto, articulo, setError]);

  const opciones = useMemo(
    () =>
      grupos
        .filter((g) => g.id_grupo !== ID_GRUPO_NO_ASIGNADO)
        .map((g) => ({ id: g.id_grupo, nombre: g.nombre_grupo ?? `Grupo ${g.id_grupo}` })),
    [grupos]
  );

  // Al cambiar de grupo el backend limpia el subgrupo (era del grupo viejo):
  // se avisa antes de guardar para que no sorprenda.
  const subgrupoActual =
    articulo?.id_subgrupo != null
      ? subgrupos.find((s) => s.id_subgrupo === articulo.id_subgrupo) ?? null
      : null;
  const pierdeSubgrupo = subgrupoActual !== null && grupoSeleccionado !== articulo?.id_grupo;

  const handleGuardar = () => {
    if (!articulo) return;
    if (grupoSeleccionado === null) {
      setError('Elegí un grupo para el artículo.');
      return;
    }

    ejecutar(async () => {
      await actualizarArticulo(articulo.id_articulo, { id_grupo: grupoSeleccionado });
      onExito();
      onCerrar();
    });
  };

  return (
    <BaseModal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo='Editar Grupo'
      permitirDesborde
      error={error ? { titulo: 'Error al editar el articulo', detalle: error } : null}
      footer={
        <>
          <button
            onClick={onCerrar}
            className='flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors cursor-pointer'
          >
            Cerrar
          </button>
          <button
            onClick={handleGuardar}
            disabled={cargando}
            className='flex-1 px-4 py-2 cursor-pointer text-sm font-medium text-white bg-violet-600 rounded-md hover:bg-violet-700 disabled:bg-violet-400 transition-colors'
          >
            {cargando ? 'Guardando...' : 'Confirmar'}
          </button>
        </>
      }
    >
      <div>
        <label className='block text-sm font-medium text-gray-700 mb-2'>Grupo de Articulos</label>
        <InlineFilterDropdown
          label='Elegir Grupo'
          opciones={opciones}
          selectedId={grupoSeleccionado}
          onSelect={setGrupoSeleccionado}
          onClear={() => {}}
          // El grupo es obligatorio: solo se reemplaza por otro.
          permitirLimpiar={false}
          conBuscador
        />

        {pierdeSubgrupo && (
          <p className='mt-3 text-sm text-amber-600'>
            Al cambiar de grupo, el artículo dejará de pertenecer al subgrupo{' '}
            <span className='font-semibold'>{subgrupoActual.nombre_subgrupo}</span>.
          </p>
        )}
      </div>
    </BaseModal>
  );
}
