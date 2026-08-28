import { useEffect } from 'react';
import BaseModal from '@/components/ui/BaseModal';
import { useAccionAsync } from '@/hooks/useAccionAsync';
import { useCuentaRegresiva } from '@/hooks/useCuentaRegresiva';

const SEGUNDOS_ESPERA = 5;

interface AccionMasivaModalProps {
  abierto: boolean;
  onCerrar: () => void;
  cantidad: number;
  onConfirmar: () => Promise<void>;
}

export default function AccionMasivaModal({
  abierto,
  onCerrar,
  cantidad,
  onConfirmar,
}: AccionMasivaModalProps) {
  const { cargando, error, setError, ejecutar } = useAccionAsync();
  // Recien se puede confirmar la accion pasados SEGUNDOS_ESPERA segundos
  // desde que se abre el modal.
  const segundosRestantes = useCuentaRegresiva(abierto, SEGUNDOS_ESPERA);

  useEffect(() => {
    if (abierto) setError(null);
  }, [abierto, setError]);

  const handleClose = () => {
    if (cargando) return;
    onCerrar();
  };

  const handleConfirmar = () => {
    if (segundosRestantes > 0 || cargando) return;

    ejecutar(async () => {
      await onConfirmar();
      onCerrar();
    });
  };

  const puedeConfirmar = segundosRestantes <= 0;

  return (
    <BaseModal
      abierto={abierto}
      onCerrar={handleClose}
      titulo='Imprimir Artículos'
      error={error ? { titulo: 'Error al imprimir los articulos', detalle: error } : null}
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
            onClick={handleConfirmar}
            disabled={!puedeConfirmar || cargando}
            className='flex-1 px-4 py-2 text-sm font-medium text-white rounded-md disabled:cursor-not-allowed transition-colors cursor-pointer bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300'
          >
            {cargando
              ? 'Imprimiendo...'
              : puedeConfirmar
              ? 'Confirmar Impresión'
              : `Confirmar Impresión (${segundosRestantes})`}
          </button>
        </>
      }
    >
      <p className='text-sm text-gray-700'>
        Se va a imprimir una etiqueta por cada uno de los{' '}
        <span className='font-semibold'>
          {cantidad} {cantidad === 1 ? 'artículo seleccionado' : 'artículos seleccionados'}
        </span>
        .
      </p>
    </BaseModal>
  );
}
