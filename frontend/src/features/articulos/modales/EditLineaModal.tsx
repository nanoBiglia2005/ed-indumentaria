import { useState, useMemo } from 'react';
import type { ARTICULOS, LINEAS } from '@backend/types';
import BaseModal from '@/components/ui/BaseModal';
import { useAccionAsync } from '@/hooks/useAccionAsync';
import { useResetAlCambiar } from '@/hooks/useResetAlCambiar';
import { actualizarArticulo } from '@/api/articulos';
import { mensajeDetallesPrimero } from '@/api/cliente';
import InlineFilterDropdown from '@/components/ui/InlineFilterDropdown';
import { ordenarPorNombre } from '@/utils/texto';

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

  const reiniciar = () => {
    if (!abierto || !articulo) return;
    setLineaSeleccionada(articulo.id_linea);
    setError(null);
  };
  useResetAlCambiar(abierto, reiniciar);
  useResetAlCambiar(articulo, reiniciar);

  const opciones = useMemo(
    () => ordenarPorNombre(lineas.map((l) => ({ id: l.id_linea, nombre: l.nombre_linea }))),
    [lineas]
  );

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
            className='flex-1 px-4 py-2 text-sm font-medium text-neutro-600 bg-neutro-100 rounded hover:bg-neutro-200 transition-colors cursor-pointer'
          >
            Cerrar
          </button>
          <button
            onClick={handleGuardar}
            disabled={cargando}
            className='flex-1 px-4 py-2 cursor-pointer text-sm font-medium text-white bg-marca-500 rounded hover:bg-marca-600 disabled:bg-marca-400 transition-colors'
          >
            {cargando ? 'Guardando...' : 'Confirmar'}
          </button>
        </>
      }
    >
      <div>
        <label className='block text-sm font-medium text-neutro-600 mb-2'>Línea</label>
        <InlineFilterDropdown
          label='Sin línea'
          opciones={opciones}
          selectedId={lineaSeleccionada}
          onSelect={setLineaSeleccionada}
          onClear={() => setLineaSeleccionada(null)}
        />
      </div>
    </BaseModal>
  );
}
