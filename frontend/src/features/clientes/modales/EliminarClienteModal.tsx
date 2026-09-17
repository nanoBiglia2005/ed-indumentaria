import type { CLIENTES } from '@backend/types';
import BaseModal from '@/components/ui/BaseModal';
import { ApiError, mensajeDetallesPrimero } from '@/api/cliente';
import { eliminarClienteFinal } from '@/api/clientesFinales';
import { useAccionAsync } from '@/hooks/useAccionAsync';
import { useCuentaRegresiva } from '@/hooks/useCuentaRegresiva';
import { useResetAlCambiar } from '@/hooks/useResetAlCambiar';
import { nombreCompleto } from '@/features/ventas/cliente/formatoCliente';

const SEGUNDOS_DE_ESPERA = 5;

interface EliminarClienteModalProps {
  abierto: boolean;
  cliente: CLIENTES | null;
  onCerrar: () => void;
  onEliminado: (cliente: CLIENTES) => void;
}

/**
 * Baja de un cliente, con la misma espera de 5 segundos que las acciones
 * destructivas sobre un remito (ConfirmarAccionRemitoModal).
 *
 * El 409 no es un fallo inesperado sino la regla del sistema: un cliente con
 * ventas no se borra porque la FK de REMITOS es restrictiva, y dejar remitos
 * sin titular seria peor que no poder borrarlo. Por eso se traduce a un texto
 * entendible en vez de mostrar el error crudo de la API.
 */
export default function EliminarClienteModal({
  abierto,
  cliente,
  onCerrar,
  onEliminado,
}: EliminarClienteModalProps) {
  const { cargando, error, setError, ejecutar } = useAccionAsync({
    mensajeDe: (err) =>
      err instanceof ApiError && err.status === 409
        ? 'Este cliente tiene ventas registradas a su nombre, así que no se puede eliminar. Si ya no opera con él, alcanza con dejarlo sin usar.'
        : mensajeDetallesPrimero(err, 'No se pudo eliminar el cliente.'),
  });

  const segundos = useCuentaRegresiva(abierto, SEGUNDOS_DE_ESPERA);

  // El modal queda montado entre usos: al llegar otro cliente se limpia.
  useResetAlCambiar(cliente, () => setError(null));

  const esperando = segundos > 0;

  const handleEliminar = () => {
    if (!cliente || esperando) return;

    ejecutar(async () => {
      await eliminarClienteFinal(cliente.id_cliente);
      onEliminado(cliente);
    });
  };

  return (
    <BaseModal
      abierto={abierto}
      onCerrar={cargando ? () => {} : onCerrar}
      titulo='Eliminar Cliente'
      colorTitulo='text-red-600'
      error={error ? { titulo: 'No se pudo eliminar', detalle: error } : null}
      footer={
        <>
          <button
            type='button'
            onClick={onCerrar}
            disabled={cargando}
            className='flex-1 px-4 py-2 text-sm font-medium text-neutro-600 bg-neutro-100 rounded hover:bg-neutro-200 transition-colors cursor-pointer disabled:opacity-60'
          >
            Cancelar
          </button>
          <button
            type='button'
            onClick={handleEliminar}
            disabled={esperando || cargando}
            className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded transition-colors ${
              esperando || cargando
                ? 'bg-red-300 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 cursor-pointer'
            }`}
          >
            {cargando ? 'Eliminando...' : esperando ? `Eliminar (${segundos})` : 'Eliminar'}
          </button>
        </>
      }
    >
      <p className='text-sm text-neutro-600'>
        Se va a eliminar al cliente{' '}
        <span className='font-semibold'>{cliente ? nombreCompleto(cliente) : ''}</span>
        {cliente?.dni ? <> (DNI {cliente.dni})</> : null}. Esta acción no se puede deshacer.
      </p>
    </BaseModal>
  );
}
