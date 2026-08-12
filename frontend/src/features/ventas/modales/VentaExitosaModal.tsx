import type { RemitoCreado } from '@backend/types';
import BaseModal from '@/components/ui/BaseModal';
import RemitoCard from '@/features/ventas/RemitoCard';

interface VentaExitosaModalProps {
  abierto: boolean;
  remito: RemitoCreado | null;
  /** Cerrar sin cobrar: el remito queda pendiente en la lista de Ventas. */
  onCerrar: () => void;
  onSeguirAlPago: (remito: RemitoCreado) => void;
}

export default function VentaExitosaModal({
  abierto,
  remito,
  onCerrar,
  onSeguirAlPago,
}: VentaExitosaModalProps) {
  return (
    <BaseModal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo='✓ Venta Registrada Exitosamente'
      claseTitulo='text-lg font-medium leading-6 text-green-600 mb-1 text-center'
      ancho='lg'
      transicionLenta
      footer={
        <>
          <button
            onClick={onCerrar}
            className='flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors cursor-pointer'
          >
            Cobrar Más Tarde
          </button>
          <button
            onClick={() => remito && onSeguirAlPago(remito)}
            className='flex-1 px-4 py-2 cursor-pointer text-sm font-medium text-white bg-violet-600 rounded-md hover:bg-violet-700 transition-colors'
          >
            Seguir al Pago
          </button>
        </>
      }
    >
      <p className='text-sm text-gray-500 mb-4 text-center'>
        El remito quedó pendiente de cobro. ¿Querés seguir al pago ahora?
      </p>

      {remito?.impresion?.status === 'error' && (
        <div className='mb-4 p-3 bg-amber-100 border border-amber-400 text-amber-800 rounded flex flex-col'>
          <span>La venta se guardó, pero no se pudo imprimir el remito.</span>
          <span className='text-amber-700 text-xs'>{remito.impresion.message}</span>
        </div>
      )}

      {remito && <RemitoCard remito={remito} abiertoPorDefecto />}
    </BaseModal>
  );
}
