import { useEffect } from 'react';
import type { ARTICULOS } from '@backend/types';
import BaseModal from '@/components/ui/BaseModal';
import { useAccionAsync } from '@/hooks/useAccionAsync';
import { useCuentaRegresiva } from '@/hooks/useCuentaRegresiva';
import { eliminarArticulo } from '@/api/articulos';

const SEGUNDOS_ESPERA = 5;

interface EliminarArticuloModalProps {
  abierto: boolean;
  onCerrar: () => void;
  onExito: () => void;
  articulo: ARTICULOS | null;
}

export default function EliminarArticuloModal({
  abierto,
  onCerrar,
  onExito,
  articulo,
}: EliminarArticuloModalProps) {
  const { cargando, error, setError, ejecutar } = useAccionAsync();
  // Recien se puede confirmar la eliminacion pasados SEGUNDOS_ESPERA segundos
  // desde que se abre el modal.
  const segundosRestantes = useCuentaRegresiva(abierto, SEGUNDOS_ESPERA);

  useEffect(() => {
    if (abierto) setError(null);
  }, [abierto, setError]);

  const handleClose = () => {
    if (cargando) return;
    onCerrar();
  };

  const handleEliminar = () => {
    if (!articulo || segundosRestantes > 0) return;

    ejecutar(async () => {
      await eliminarArticulo(articulo.id_articulo);
      onExito();
      onCerrar();
    });
  };

  const puedeConfirmar = segundosRestantes <= 0;

  return (
    <BaseModal
      abierto={abierto}
      onCerrar={handleClose}
      titulo='Eliminar Artículo'
      error={error ? { titulo: 'Error al eliminar el articulo', detalle: error } : null}
      footer={
        <>
          <button
            onClick={handleClose}
            disabled={cargando}
            className='flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-60'
          >
            Cancelar
          </button>
          <button
            onClick={handleEliminar}
            disabled={!puedeConfirmar || cargando}
            className='flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed transition-colors cursor-pointer'
          >
            {cargando
              ? 'Eliminando...'
              : puedeConfirmar
              ? 'Confirmar Eliminación'
              : `Confirmar Eliminación (${segundosRestantes})`}
          </button>
        </>
      }
    >
      <p className='text-sm text-gray-700'>
        ¿Estás seguro que querés eliminar
        {articulo?.descripcion ? (
          <>
            {' '}
            el artículo <span className='font-semibold'>{articulo.descripcion}</span>
          </>
        ) : (
          ' este artículo'
        )}
        ? Esta acción no se puede deshacer.
      </p>
    </BaseModal>
  );
}
