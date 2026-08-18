import type { RemitoCreadoConCliente } from '@backend/types';
import BaseModal from '@/components/ui/BaseModal';
import { estiloLineClamp, formatearFecha } from '@/utils/formato';
import { codigoRemito } from '@/features/ventas/codigoRemito';
import { nombreCompleto } from '@/features/ventas/cliente/formatoCliente';

const MAX_LINEAS_DESCRIPCION = 2;

interface VentaExitosaModalPruebaProps {
  abierto: boolean;
  remito: RemitoCreadoConCliente | null;
  /** Cerrar sin cobrar: el remito queda pendiente en la lista de Ventas. */
  onCerrar: () => void;
  onSeguirAlPago: (remito: RemitoCreadoConCliente) => void;
}

/**
 * COPIA DE PRUEBA de VentaExitosaModal. Cambia respecto de la original:
 *  - el remito se identifica con su codigo visible (mes + numero del mes) en
 *    vez del id interno;
 *  - se muestra el cliente asignado;
 *  - la tarjeta se arma aca (no con RemitoCard) porque el flujo nuevo ya no
 *    carga la fecha de emision: la unica fecha que hay es la de creacion.
 */
export default function VentaExitosaModalPrueba({
  abierto,
  remito,
  onCerrar,
  onSeguirAlPago,
}: VentaExitosaModalPruebaProps) {
  // Los remitos anteriores al trigger de la base no tienen numero: se cae al id.
  const codigo = remito
    ? codigoRemito(remito.cod_mes, remito.cod_remito_final) ?? `#${remito.id_remito}`
    : '';

  return (
    <BaseModal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo='Venta Registrada Exitosamente'
      claseTitulo='text-xl font-semibold leading-7 text-green-600 mb-1 text-center'
      ancho='2xl'
      transicionLenta
      footer={
        <div className='flex w-full flex-col gap-3 sm:flex-row'>
          <button
            onClick={onCerrar}
            className='flex-1 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors cursor-pointer'
          >
            Cobrar Más Tarde
          </button>
          <button
            onClick={() => remito && onSeguirAlPago(remito)}
            className='flex-1 px-4 py-2 cursor-pointer text-sm font-medium text-white bg-violet-700 rounded-md hover:bg-violet-800 transition-colors'
          >
            Seguir al Pago
          </button>
        </div>
      }
    >
      <p className='mb-4 text-center text-sm font-medium text-gray-600'>
        El remito está registrado pero no cobrado. ¿Querés seguir al pago ahora?
      </p>

      {remito?.impresion?.status === 'error' && (
        <div className='mb-4 flex flex-col rounded border border-amber-400 bg-amber-100 p-3 text-amber-800'>
          <span>La venta se guardó, pero no se pudo imprimir el remito.</span>
          <span className='text-xs text-amber-700'>{remito.impresion.message}</span>
        </div>
      )}

      {remito && (
        <div className='rounded-xl border border-gray-200 overflow-hidden'>
          <div className='flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 px-4 py-3'>
            <span className='text-3xl font-bold text-violet-600'>{codigo}</span>

            <div className='flex flex-wrap items-center gap-6'>
              <div className='flex flex-col'>
                <span className='text-xs text-gray-400'>Fecha de Creación</span>
                <span className='font-medium text-black'>
                  {formatearFecha(remito.fecha_de_creacion)}
                </span>
              </div>
              <div className='flex flex-col'>
                <span className='text-xs text-gray-400'>Cliente</span>
                <span className='font-medium text-black'>
                  {remito.CLIENTES ? nombreCompleto(remito.CLIENTES) : 'Sin asignar'}
                </span>
              </div>
              <div className='flex flex-col items-end'>
                <span className='text-xs text-gray-400'>Total</span>
                <span className='text-xl font-bold text-violet-600'>{remito.total_inicial ?? 0}$</span>
              </div>
            </div>
          </div>

          <div className='max-h-56 overflow-y-auto divide-y divide-gray-100'>
            {remito.DETALLES_REMITO.length === 0 ? (
              <p className='px-4 py-3 text-sm italic text-gray-400'>Sin artículos</p>
            ) : (
              remito.DETALLES_REMITO.map((detalle) => (
                <div key={detalle.id_detalle} className='flex items-center gap-3 px-4 py-2'>
                  <div className='flex-1 min-w-0 flex flex-col text-left'>
                    <span
                      className='text-sm font-semibold text-gray-800 break-words'
                      style={estiloLineClamp(MAX_LINEAS_DESCRIPCION)}
                    >
                      {detalle.ARTICULOS?.descripcion ?? `Artículo ${detalle.id_articulo}`}
                    </span>
                    <span className='text-xs font-medium text-gray-500'>{detalle.precio ?? 0}$</span>
                  </div>
                  <span className='text-sm text-gray-500 shrink-0'>x{detalle.cantidad ?? 0}</span>
                  <span className='w-24 text-right text-sm font-semibold text-gray-800 shrink-0'>
                    {(detalle.precio ?? 0) * (detalle.cantidad ?? 0)}$
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </BaseModal>
  );
}
