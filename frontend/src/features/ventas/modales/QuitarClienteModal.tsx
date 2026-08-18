import type { CLIENTES } from '@backend/types';
import BaseModal from '@/components/ui/BaseModal';
import { nombreCompleto } from '@/features/ventas/cliente/formatoCliente';

interface QuitarClienteModalProps {
  abierto: boolean;
  cliente: CLIENTES | null;
  onCerrar: () => void;
  onQuitar: () => void;
}

/**
 * Confirmacion de sacarle el cliente a la venta. No borra nada de la base:
 * solo deja la venta sin cliente asignado y vuelve la seccion a su estado
 * inicial (buscador + "Crear Nuevo Cliente"). Los cambios que se hubieran
 * hecho en los datos y no se guardaron se pierden, por eso se avisa.
 */
export default function QuitarClienteModal({
  abierto,
  cliente,
  onCerrar,
  onQuitar,
}: QuitarClienteModalProps) {
  return (
    <BaseModal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo='¿Quitar el cliente de la venta?'
      ancho='md'
      z='z-[60]'
      footer={
        <>
          <button
            type='button'
            onClick={onCerrar}
            className='flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors cursor-pointer'
          >
            Cancelar
          </button>
          <button
            type='button'
            onClick={onQuitar}
            className='flex-1 px-4 py-2 text-sm font-medium text-amber-700 border border-amber-500 rounded-md hover:bg-amber-50 transition-colors cursor-pointer'
          >
            Quitar Asignación
          </button>
        </>
      }
    >
      <p className='text-sm text-gray-600'>
        La venta va a quedar sin cliente asignado.{' '}
        {cliente && (
          <>
            <span className='font-semibold'>{nombreCompleto(cliente)}</span> no se elimina del
            sistema: solo se desasocia de esta venta.
          </>
        )}
      </p>
      <p className='mt-2 text-sm text-gray-500'>
        Si editaste algún dato y todavía no confirmaste la venta, esos cambios se descartan.
      </p>
    </BaseModal>
  );
}
