import { useState } from 'react';
import type { RemitoCreado, TIPOS_DE_PAGO } from '@backend/types';
import BaseModal from '@/components/ui/BaseModal';
import ReimprimirRemitoModal from '@/features/ventas/modales/ReimprimirRemitoModal';
import { estiloLineClamp, formatearFecha, formatearPesos } from '@/utils/formato';
import { codigoRemito } from '@/features/ventas/codigoRemito';
import { nombreCompleto } from '@/features/ventas/cliente/formatoCliente';
import PaymentIcon from '@/components/ui/PaymentIcon';

const MAX_LINEAS_DESCRIPCION = 2;

/**
 * Columnas del detalle: articulo | cantidad | subtotal. La comparten el
 * encabezado y cada fila, que es lo unico que garantiza que los rotulos caigan
 * sobre sus valores (el ancho del contenido cambia con la cantidad de metodos
 * de pago con recargo). El subtotal mantiene como minimo el ancho anterior
 * (6rem ~ w-24) y crece si el importe no entra.
 */
const COLUMNAS = 'grid grid-cols-[minmax(0,1fr)_2.5rem_minmax(6rem,auto)] items-center gap-3 px-4';

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
  // El caso mas frecuente de reimpresion es este: la impresora estaba
  // desconectada justo al vender. Se ofrece aca para no obligar a ir al
  // historial a buscar el remito.
  const [reintentando, setReintentando] = useState(false);

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
            className='flex-1 px-4 py-2 text-sm font-medium text-neutro-600 border border-neutro-200 rounded hover:bg-neutro-50 transition-colors cursor-pointer'
          >
            Cobrar Más Tarde
          </button>
          <button
            onClick={() => remito && onSeguirAlPago(remito)}
            className='flex-1 px-4 py-2 cursor-pointer text-sm font-medium text-white bg-marca-500 rounded hover:bg-marca-600 transition-colors'
          >
            Seguir al Pago
          </button>
        </div>
      }
    >
      <p className='mb-4 text-center text-sm font-medium text-neutro-600'>
        El remito está registrado pero no cobrado. ¿Querés seguir al pago ahora?
      </p>

      {remito?.impresion?.status === 'error' && (
        <div className='mb-4 flex flex-wrap items-center justify-between gap-3 rounded border border-acento-500 bg-acento-100 p-3 text-acento-800'>
          <div className='flex flex-col'>
            <span>La venta se guardó, pero no se pudo imprimir el remito.</span>
            <span className='text-xs text-acento-800'>{remito.impresion.message}</span>
          </div>
          <button
            type='button'
            onClick={() => setReintentando(true)}
            className='shrink-0 cursor-pointer rounded bg-acento-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-acento-600'
          >
            Reintentar impresión
          </button>
        </div>
      )}

      {remito && (
        <div className='mt-2 rounded border border-neutro-200 overflow-hidden'>
          <div className='flex flex-wrap items-center justify-between gap-4 border-b border-neutro-200 px-4 py-3'>
            <span className='text-3xl font-bold text-marca-600'>{codigo}</span>

            <div className='flex flex-wrap items-center gap-6'>
              <div className='flex flex-col'>
                <span className='text-xs text-neutro-400'>Fecha de Creación</span>
                <span className='font-medium text-black'>
                  {formatearFecha(remito.fecha_de_creacion)}
                </span>
              </div>
              <div className='flex flex-col'>
                <span className='text-xs text-neutro-400'>Cliente</span>
                <span className='font-medium text-black'>
                  {remito.CLIENTES ? nombreCompleto(remito.CLIENTES) : 'Sin asignar'}
                </span>
              </div>
              <div className='flex flex-col items-start text-xl'>
                <div className='flex gap-x-3 font-bold'>
                  <div className='flex gap-1 items-center text-black'>
                    <PaymentIcon paymentId={1} height={20}/>
                    <span>{formatearPesos(remito.total_efectivo ?? 0)}</span>
                  </div>
                  
                  {metodosConRecargo.map((metodo) => (
                    <div className='text-marca-600 flex gap-1 items-center'>
                      <PaymentIcon paymentId={metodo.id_tipos_de_pago} height={20}/>
                      <span>{formatearPesos(remito.totales_por_metodo[metodo.id_tipos_de_pago])}</span>
                    </div>
                  ))}                              
                </div>          
              </div>
            </div>
          </div>

          <div className='max-h-56 overflow-y-auto divide-y divide-neutro-100'>
            {remito.DETALLES_REMITO.length === 0 ? (
              <p className='px-4 py-3 text-sm italic text-neutro-400'>Sin artículos</p>
            ) : (
              <>
                {/* Mismo encabezado que el detalle de RemitoCard (esta tarjeta
                    se arma aparte, ver cabecera del archivo) y con LA MISMA
                    plantilla de columnas que las filas, para que los rotulos
                    caigan sobre sus valores. */}
                <div
                  className={`${COLUMNAS} sticky top-0 z-10 bg-white py-2 text-[10px] font-semibold uppercase tracking-wide text-neutro-400`}
                >
                  <span>Artículo / precio unitario</span>
                  <span className='text-center'>Cant.</span>
                  <span className='text-right'>Subtotal</span>
                </div>
                {remito.DETALLES_REMITO.map((detalle) => (
                <div key={detalle.id_detalle} className={`${COLUMNAS} py-2`}>
                  <div className='min-w-0 flex flex-col text-left'>
                    <span
                      className='text-sm font-semibold text-neutro-900 break-words'
                      style={estiloLineClamp(MAX_LINEAS_DESCRIPCION)}
                    >
                      {detalle.ARTICULOS?.descripcion ?? `Artículo ${detalle.id_articulo}`}
                    </span>
                    {/* Precio registrado y, debajo, lo que ya vino calculado
                        con cada metodo: nunca se recalcula aca. */}
                    <div className='flex gap-2 items-center'>
                      <span className='flex gap-1 items-center' title='Precio del Artículo con Efectivo'>
                        <PaymentIcon paymentId={1} height={16} />
                        <span className='text-xs font-medium text-neutro-600'>{formatearPesos(detalle.precio ?? 0)}</span>
                      </span>
                      {metodosConRecargo.map((metodo) => (
                        <span
                          key={metodo.id_tipos_de_pago}
                          className='flex gap-1 items-center text-marca-600'
                          title={`Precio del Artículo con ${metodo.nombre_tipo_de_pago}`}
                        >
                          <PaymentIcon paymentId={metodo.id_tipos_de_pago} height={16} />
                          <span className='text-xs font-medium'>
                            {formatearPesos(detalle.precios_por_metodo[metodo.id_tipos_de_pago] ?? 0)}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className='text-sm text-center text-neutro-600'>x{detalle.cantidad ?? 0}</span>
                  <div className='flex flex-col items-end'>
                    <span className='flex gap-1 items-center' title='Total del Artículo con Efectivo'>   
                      <span className='text-sm font-semibold text-neutro-900'>
                        {formatearPesos((detalle.precio ?? 0) * (detalle.cantidad ?? 0))}
                      </span>
                      <PaymentIcon paymentId={1} height={16} />
                    </span>
                    {metodosConRecargo.map((metodo) => (
                      <span
                        key={metodo.id_tipos_de_pago}
                        className='flex gap-1 items-center text-marca-600'
                        title={`Total del Artículo con ${metodo.nombre_tipo_de_pago}`}
                      >   
                        <span className='text-sm font-semibold'>
                          {formatearPesos((detalle.precios_por_metodo[metodo.id_tipos_de_pago] ?? 0) *
                            (detalle.cantidad ?? 0))}
                        </span>
                        <PaymentIcon paymentId={metodo.id_tipos_de_pago} height={16} />
                      </span>
                    ))}
                  </div>
                </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      <ReimprimirRemitoModal
        abierto={reintentando}
        onCerrar={() => setReintentando(false)}
        remito={remito}
      />
    </BaseModal>
  );
}
