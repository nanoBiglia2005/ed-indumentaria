import { useState, useEffect, useMemo } from 'react';
import type { ARTICULOS, GRUPOS_DE_VENTA, SUBGRUPOS_DE_VENTA } from '@backend/types';
import BaseModal from '@/components/ui/BaseModal';
import { useAccionAsync } from '@/hooks/useAccionAsync';
import { actualizarArticulo } from '@/api/articulos';
import { mensajeDetallesPrimero } from '@/api/cliente';
import InlineFilterDropdown from '@/components/ui/InlineFilterDropdown';

interface EditSubgrupoModalProps {
  abierto: boolean;
  onCerrar: () => void;
  onExito: () => void;
  articulo: ARTICULOS | null;
  grupos: GRUPOS_DE_VENTA[];
  subgrupos: SUBGRUPOS_DE_VENTA[];
}

/**
 * Cambia el subgrupo del articulo dentro de su grupo. Las opciones son los
 * subgrupos de ESE grupo; la X del selector lo deja sin subgrupo
 * (id_subgrupo = null).
 */
export default function EditSubgrupoModal({
  abierto,
  onCerrar,
  onExito,
  articulo,
  grupos,
  subgrupos,
}: EditSubgrupoModalProps) {
  const [subgrupoSeleccionado, setSubgrupoSeleccionado] = useState<number | null>(null);
  const { cargando, error, setError, ejecutar } = useAccionAsync({
    mensajeDe: (err) => mensajeDetallesPrimero(err, 'No se pudo actualizar el subgrupo del artículo.'),
  });

  useEffect(() => {
    if (!abierto || !articulo) return;
    setSubgrupoSeleccionado(articulo.id_subgrupo);
    setError(null);
  }, [abierto, articulo, setError]);

  const grupo = articulo ? grupos.find((g) => g.id_grupo === articulo.id_grupo) ?? null : null;

  const opciones = useMemo(() => {
    if (!articulo) return [];
    return subgrupos
      .filter((s) => s.id_grupo === articulo.id_grupo)
      .map((s) => ({ id: s.id_subgrupo, nombre: s.nombre_subgrupo }));
  }, [articulo, subgrupos]);

  const handleGuardar = () => {
    if (!articulo) return;

    ejecutar(async () => {
      await actualizarArticulo(articulo.id_articulo, { id_subgrupo: subgrupoSeleccionado });
      onExito();
      onCerrar();
    });
  };

  return (
    <BaseModal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo='Editar Subgrupo'
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
        <label className='block text-sm font-medium text-gray-700 mb-2'>
          Subgrupo de {grupo?.nombre_grupo ?? 'su grupo'}
        </label>
        <InlineFilterDropdown
          label={opciones.length === 0 ? 'Sin subgrupos' : 'Sin subgrupo'}
          opciones={opciones}
          selectedId={subgrupoSeleccionado}
          onSelect={setSubgrupoSeleccionado}
          onClear={() => setSubgrupoSeleccionado(null)}
          disabled={opciones.length === 0}
          conBuscador
        />

        {opciones.length === 0 && (
          <p className='mt-3 text-sm text-gray-400 italic'>
            {grupo?.nombre_grupo ?? 'El grupo del artículo'} no tiene subgrupos.
          </p>
        )}
      </div>
    </BaseModal>
  );
}
