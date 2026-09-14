import { useEffect } from 'react';
import BaseModal from '@/components/ui/BaseModal';
import { useAccionAsync } from '@/hooks/useAccionAsync';
import { mensajeDetallesPrimero } from '@/api/cliente';

interface ConfirmarPreciosModalProps {
  abierto: boolean;
  onCerrar: () => void;
  /** Cuantos talles tienen precio cargado. */
  cantidadTalles: number;
  /** Cuantos articulos van a quedar actualizados en total. */
  cantidadArticulos: number;
  onConfirmar: () => Promise<void>;
}

/**
 * Confirmacion de la actualizacion masiva: el precio anterior se pisa y no hay
 * forma de volver atras, asi que antes se muestra a cuantos articulos alcanza.
 */
export default function ConfirmarPreciosModal({
  abierto,
  onCerrar,
  cantidadTalles,
  cantidadArticulos,
  onConfirmar,
}: ConfirmarPreciosModalProps) {
  const { cargando, error, setError, ejecutar } = useAccionAsync({
    mensajeDe: (err) => mensajeDetallesPrimero(err, 'No se pudieron actualizar los precios.'),
  });

  useEffect(() => {
    if (abierto) setError(null);
  }, [abierto, setError]);

  const handleCerrar = () => {
    if (cargando) return;
    onCerrar();
  };

  const handleConfirmar = () => {
    if (cargando) return;
    ejecutar(async () => {
      await onConfirmar();
      onCerrar();
    });
  };

  return (
    <BaseModal
      abierto={abierto}
      onCerrar={handleCerrar}
      titulo='Actualizar Precios'
      error={error ? { titulo: 'Error al actualizar los precios', detalle: error } : null}
      footer={
        <>
          <button
            onClick={handleCerrar}
            disabled={cargando}
            className='flex-1 px-4 py-2 text-sm font-medium text-neutro-600 bg-neutro-100 rounded hover:bg-neutro-200 transition-colors cursor-pointer disabled:opacity-60'
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={cargando}
            className='flex-1 px-4 py-2 text-sm font-medium text-white bg-marca-500 rounded hover:bg-marca-600 transition-colors cursor-pointer disabled:bg-marca-400 disabled:cursor-not-allowed'
          >
            {cargando ? 'Actualizando...' : 'Confirmar'}
          </button>
        </>
      }
    >
      <p className='text-sm text-neutro-600'>
        Se va a fijar el precio de{' '}
        <span className='font-semibold'>
          {cantidadArticulos} {cantidadArticulos === 1 ? 'artículo' : 'artículos'}
        </span>{' '}
        en{' '}
        <span className='font-semibold'>
          {cantidadTalles} {cantidadTalles === 1 ? 'talle' : 'talles'}
        </span>
        . El precio anterior se pierde.
      </p>
    </BaseModal>
  );
}
