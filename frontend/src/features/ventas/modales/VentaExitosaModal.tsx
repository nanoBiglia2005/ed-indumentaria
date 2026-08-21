import type { RemitoCreado, TIPOS_DE_PAGO } from '@backend/types';
import BaseModal from '@/components/ui/BaseModal';
import { estiloLineClamp, formatearFecha } from '@/utils/formato';
import { codigoRemito } from '@/features/ventas/codigoRemito';
import { nombreCompleto } from '@/features/ventas/cliente/formatoCliente';
import PaymentIcon from '@/components/ui/PaymentIcon';

const MAX_LINEAS_DESCRIPCION = 2;

interface VentaExitosaModalProps {
  abierto: boolean;
  remito: RemitoCreado | null;
  metodosConRecargo: TIPOS_DE_PAGO[];
  /** Cerrar sin cobrar: el remito queda pendiente en la lista de Ventas. */
  onCerrar: () => void;
  onSeguirAlPago: (remito: RemitoCreado) => void;
}

/**
 * Confirmacion de que la venta quedo registrada.
 *
 * El remito viene con `precios_por_metodo` YA CALCULADO en cada linea de
 * DETALLES_REMITO (services/preciosPorMetodo.js) y es la MISMA cuenta que se
 * sumo para armar `totales_por_metodo`: por eso aca no se vuelve a aplicar
 * ningun recargo, solo se lee lo que ya viene. Si se recalculara aca (por
 * ejemplo volviendo a pedir los metodos de pago), el precio de un articulo
 * podria terminar sin coincidir con el total si el recargo cambio en el medio.
 *
 * La tarjeta se arma aca (no con RemitoCard) porque este flujo ya no carga la
 * fecha de emision: la unica fecha que hay es la de creacion.
 */
export default function VentaExitosaModal({
  abierto,
  remito,
  metodosConRecargo,
  onCerrar,
  onSeguirAlPago,
}: VentaExitosaModalProps) {
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
              <div className='flex flex-col items-start text-xl'>
                <div className='flex gap-x-3 font-bold'>
                  <div className='flex gap-1 items-center text-black'>
                    <PaymentIcon paymentId={1} height={20}/>
                    <span>{remito.total_efectivo ?? 0}$</span>
                  </div>
                  
                  {metodosConRecargo.map((metodo) => (
                    <div className='text-violet-600 flex gap-1 items-center'>
                      <PaymentIcon paymentId={metodo.id_tipos_de_pago} height={20}/>
                      <span>{remito.totales_por_metodo[metodo.id_tipos_de_pago]}$</span>
                    </div>
                  ))}                              
                </div>          
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
                    {/* Precio registrado y, debajo, lo que ya vino calculado
                        con cada metodo: nunca se recalcula aca. */}
                    <div className='flex gap-2 items-center'>
                      <span className='flex gap-1 items-center' title='Precio del Artículo con Efectivo'>
                        <PaymentIcon paymentId={1} height={16} />
                        <span className='text-xs font-medium text-gray-500'>{detalle.precio ?? 0}$</span>
                      </span>
                      {metodosConRecargo.map((metodo) => (
                        <span
                          key={metodo.id_tipos_de_pago}
                          className='flex gap-1 items-center text-violet-600'
                          title={`Precio del Artículo con ${metodo.nombre_tipo_de_pago}`}
                        >
                          <PaymentIcon paymentId={metodo.id_tipos_de_pago} height={16} />
                          <span className='text-xs font-medium'>
                            {detalle.precios_por_metodo[metodo.id_tipos_de_pago] ?? 0}$
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className='text-sm text-gray-500 shrink-0'>x{detalle.cantidad ?? 0}</span>
                  <div className='w-24 flex flex-col items-end shrink-0'>
                    <span className='flex gap-1 items-center' title='Total del Artículo con Efectivo'>   
                      <span className='text-sm font-semibold text-gray-800'>
                        {(detalle.precio ?? 0) * (detalle.cantidad ?? 0)}$
                      </span>
                      <PaymentIcon paymentId={1} height={16} />
                    </span>
                    {metodosConRecargo.map((metodo) => (
                      <span
                        key={metodo.id_tipos_de_pago}
                        className='flex gap-1 items-center text-violet-600'
                        title={`Total del Artículo con ${metodo.nombre_tipo_de_pago}`}
                      >   
                        <span className='text-sm font-semibold'>
                          {(detalle.precios_por_metodo[metodo.id_tipos_de_pago] ?? 0) *
                            (detalle.cantidad ?? 0)}
                          $
                        </span>
                        <PaymentIcon paymentId={metodo.id_tipos_de_pago} height={16} />
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </BaseModal>
  );
}
