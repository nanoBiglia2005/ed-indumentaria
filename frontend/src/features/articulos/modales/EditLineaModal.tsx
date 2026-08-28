import { useState, useEffect } from 'react';
import type { ARTICULOS, LINEAS } from '@backend/types';
import BaseModal from '@/components/ui/BaseModal';
import { useAccionAsync } from '@/hooks/useAccionAsync';
import { actualizarArticulo } from '@/api/articulos';
import { mensajeDetallesPrimero } from '@/api/cliente';
import InlineFilterDropdown from '@/components/ui/InlineFilterDropdown';

interface EditLineaModalProps {
  abierto: boolean;
  onCerrar: () => void;
  onExito: () => void;
  articulo: ARTICULOS | null;
  lineas: LINEAS[];
}

export default function EditLineaModal({
  abierto,
  onCerrar,
  onExito,
  articulo,
  lineas,
}: EditLineaModalProps) {
  const [lineaSeleccionada, setLineaSeleccionada] = useState<number | null>(null);
  const { cargando, error, setError, ejecutar } = useAccionAsync({
    mensajeDe: (err) => mensajeDetallesPrimero(err, 'No se pudo actualizar la línea del artículo.'),
  });

  useEffect(() => {
    if (!abierto || !articulo) return;
    setLineaSeleccionada(articulo.id_linea);
    setError(null);
  }, [abierto, articulo, setError]);

  const handleGuardar = () => {
    if (!articulo) return;

    ejecutar(async () => {
      await actualizarArticulo(articulo.id_articulo, { id_linea: lineaSeleccionada });
      onExito();
      onCerrar();
    });
  };

  return (
    <BaseModal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo='Editar Línea'
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
        <label className='block text-sm font-medium text-gray-700 mb-2'>Línea</label>
        <InlineFilterDropdown
          label='Sin línea'
          opciones={lineas.map((l) => ({ id: l.id_linea, nombre: l.nombre_linea }))}
          selectedId={lineaSeleccionada}
          onSelect={setLineaSeleccionada}
          onClear={() => setLineaSeleccionada(null)}
        />
      </div>
    </BaseModal>
  );
}
