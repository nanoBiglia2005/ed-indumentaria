import type { RemitoConDetalles } from '@backend/types';
import BaseModal from '@/components/ui/BaseModal';
import { useAccionAsync } from '@/hooks/useAccionAsync';
import { useCuentaRegresiva } from '@/hooks/useCuentaRegresiva';
import { useResetAlCambiar } from '@/hooks/useResetAlCambiar';
import { anularRemito } from '@/api/remitos';
import { mensajeDetallesPrimero } from '@/api/cliente';

const SEGUNDOS_DE_ESPERA = 5;

interface AnularRemitoModalProps {
  abierto: boolean;
  remito: RemitoConDetalles | null;
  onCerrar: () => void;
  onAnulado: (remito: RemitoConDetalles) => void;
}

export default function AnularRemitoModal({
  abierto,
  remito,
  onCerrar,
  onAnulado,
}: AnularRemitoModalProps) {
  const { cargando, error, setError, ejecutar } = useAccionAsync({
    mensajeDe: (err) => mensajeDetallesPrimero(err, 'No se pudo anular el remito.'),
  });
  // Cuenta regresiva antes de habilitar la anulacion.
  const segundos = useCuentaRegresiva(abierto, SEGUNDOS_DE_ESPERA);

  // Reset al llegar un remito distinto (el modal queda montado entre usos).
  useResetAlCambiar(remito, () => setError(null));

  const handleAnular = () => {
    if (!remito || segundos > 0) return;

    ejecutar(async () => {
      onAnulado(await anularRemito(remito.id_remito));
    });
  };

  const esperando = segundos > 0;

  return (
    <BaseModal
      abierto={abierto}
      onCerrar={cargando ? () => {} : onCerrar}
      titulo='Anular Remito'
      colorTitulo='text-red-600'
      z='z-[60]'
      error={error ? { titulo: 'Error al anular el remito', detalle: error } : null}
      footer={
        <>
          <button
            onClick={onCerrar}
            disabled={cargando}
            className='flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-60'
          >
            Cancelar
          </button>
          <button
            onClick={handleAnular}
            disabled={esperando || cargando}
            className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${
              esperando || cargando
                ? 'bg-red-300 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 cursor-pointer'
            }`}
          >
            {cargando ? 'Anulando...' : esperando ? `Anular (${segundos})` : 'Anular'}
          </button>
        </>
      }
    >
      <p className='text-sm text-gray-700'>
        Vas a anular el remito <span className='font-semibold'>#{remito?.cod_mes}-{remito?.cod_remito_final}</span> por{' '}
        <span className='font-semibold'>{remito?.total_efectivo ?? 0}$</span>. Esta acción no se
        puede deshacer.
      </p>
    </BaseModal>
  );
}
