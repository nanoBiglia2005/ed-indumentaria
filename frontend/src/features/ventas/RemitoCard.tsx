import { useState } from 'react';
import type { RemitoConDetalles, TIPOS_DE_PAGO } from '@backend/types';
import {
  ESTADO_ANULADO,
  ESTADO_CONFIRMADO,
  ESTADO_DEVUELTO,
  ESTADO_FACTURADO,
} from '@backend/types';
import { formatearFecha } from '@/utils/formato';
import PaymentIcon from '@/components/ui/PaymentIcon';

// Borde segun el estado del remito (tabla ESTADOS_REMITOS).
const BORDE_POR_ESTADO: Record<number, string> = {
  [ESTADO_CONFIRMADO]: 'border-orange-500',
  [ESTADO_FACTURADO]: 'border-violet-500',
  [ESTADO_ANULADO]: 'border-amber-400',
  [ESTADO_DEVUELTO]: 'border-red-500',
};

interface RemitoCardProps {
  remito: RemitoConDetalles;
  /** Metodos de pago, para rotular cada total mientras no este cobrado. */
  metodos?: TIPOS_DE_PAGO[];
  abiertoPorDefecto?: boolean;
  /** Si se pasan, aparecen los botones en el encabezado del detalle. */
  onPagar?: (remito: RemitoConDetalles) => void;
  onAnular?: (remito: RemitoConDetalles) => void;
}

function RemitoCard({
  remito,
  metodos = [],
  abiertoPorDefecto = false,
  onPagar,
  onAnular,
}: RemitoCardProps) {
  const [abierto, setAbierto] = useState(abiertoPorDefecto);

  // Cobrado: lo que se cobro de verdad es un solo numero. Sin cobrar (pendiente
  // o anulado) todavia no hay metodo elegido, asi que se muestra cuanto saldria
  // con cada uno: el precio base y los metodos con recargo.
  const cobrado = remito.id_estado === ESTADO_FACTURADO;
  const metodosConRecargo = metodos.filter((metodo) => metodo.recargo > 0);

  const borde = BORDE_POR_ESTADO[remito.id_estado ?? ESTADO_FACTURADO] ?? 'border-violet-500';
  const hayAcciones = Boolean(onPagar || onAnular);

  // shrink-0: dentro de la lista en columna, si no, las tarjetas se aplastan
  // en vez de dejar scrollear cuando hay muchas ventas.
  return (
    <div className={`w-full shrink-0 border ${borde} rounded-xl shadow select-none overflow-hidden`}>
      <button
        type='button'
        onClick={() => setAbierto((prev) => !prev)}
        className='w-full flex items-center justify-between gap-4 px-5 py-3 cursor-pointer text-left hover:bg-amber-50 transition-color duration-100 ease-in'
      >
        <div className='flex gap-8'>
          {cobrado ? (
            <div className='flex flex-col'>
              <span className='text-xs text-gray-400'>Fecha de Emisión</span>
              <span className='text-black font-medium'>{formatearFecha(remito.fecha_de_emision)}</span>
            </div>
          ) : ''}
          <div className='flex flex-col'>
            <span className='text-xs text-gray-400'>Fecha de Creación</span>
            <span className='text-black font-medium'>{formatearFecha(remito.fecha_de_creacion)}</span>
          </div>
        </div>
        <div className='flex items-center gap-4 shrink-0'>
        {hayAcciones && (
          // sticky: queda fijo como encabezado del detalle aunque se scrollee la lista.
          <div className='flex items-center justify-end gap-2 px-5 py-2 border-b border-black/5'>
            {onPagar && (
              <button
                type='button'
                onClick={() => onPagar(remito)}
                className='rounded border border-violet-500 bg-violet-500 px-3 py-1 text-sm font-semibold text-white cursor-pointer transition-color duration-100 ease-in hover:bg-violet-600 active:bg-violet-700'
              >
                Pagar Remito
              </button>
            )}
            {onAnular && (
              <button
                type='button'
                onClick={() => onAnular(remito)}
                className='rounded border border-red-500 px-3 py-1 text-sm font-semibold text-red-600 cursor-pointer transition-color duration-100 ease-in hover:bg-red-500 hover:text-white'
              >
                Anular Remito
              </button>
            )}
          </div>
        )}
          {cobrado ? (
            <span className='text-lg font-semibold text-violet-600'>{remito.total_final ?? 0}$</span>
          ) : (
            <div className='flex flex-col items-end w-30'>
              <span className='text-lg font-semibold text-gray-900 flex gap-1 items-center'>
                {remito.total_efectivo ?? 0}$
                <PaymentIcon paymentId={1} height={24}/>
              </span>
              {metodosConRecargo.map((metodo) => (
                <span
                  key={metodo.id_tipos_de_pago}
                  className='text-lg font-semibold text-violet-600 flex gap-1 items-center'
                  title={`Total con ${metodo.nombre_tipo_de_pago}`}
                >
                  {remito.totales_por_metodo?.[metodo.id_tipos_de_pago] ?? 0}$
                  <PaymentIcon paymentId={metodo.id_tipos_de_pago} height={24}/>
                </span>
              ))}
            </div>
          )}
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ease-in-out ${
              abierto ? 'rotate-180' : ''
            }`}
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
            strokeWidth={2}
          >
            <path strokeLinecap='round' strokeLinejoin='round' d='M19 9l-7 7-7-7' />
          </svg>
        </div>
      </button>

      <div
        className={`overflow-y-auto border-t transition-all duration-200 ease-in-out ${
          abierto ? 'max-h-60 border-black/10' : 'max-h-0 border-transparent'
        }`}
      >

        <div className='px-5 py-2 divide-y divide-black/5'>
          {remito.DETALLES_REMITO.length === 0 ? (
            <p className='text-sm text-gray-400 italic py-2'>Sin artículos</p>
          ) : (
            remito.DETALLES_REMITO.map((detalle) => (
              <div key={detalle.id_detalle} className='flex items-center justify-between gap-3 py-2 text-sm text-black'>
                <div className='flex flex-col min-w-[300px] font-medium'>
                  <span className='truncate'>{detalle.ARTICULOS?.descripcion ?? `Artículo ${detalle.id_articulo}`}</span>
                  <div className='flex gap-x-3'>
                    <div className='flex gap-1 items-center min-w-18'>
                      <PaymentIcon paymentId={1} height={16}/>
                      <span className='text-gray-500'>{detalle.precio ?? 0}$</span>
                    </div> 
                    {metodosConRecargo.map((metodo) => (
                      <div className='text-violet-500 flex gap-1 items-center min-w-18'>
                        <PaymentIcon paymentId={metodo.id_tipos_de_pago} height={16}/>
                        <span>{detalle.precios_por_metodo[metodo.id_tipos_de_pago]}$</span>
                      </div>
                    ))}
                  </div>       
                </div>     
                <div className='flex items-center gap-4 shrink-0 text-gray-600'>
                  <span>x{detalle.cantidad}</span>
                  <div className='flex-col text-md'>
                    <div className='flex gap-1 items-center text-black justify-end'>
                      <span className='font-medium'>{detalle.precio && detalle.cantidad ? detalle.precio * detalle.cantidad : 0}$</span>
                      <PaymentIcon paymentId={1} height={16}/>
                    </div>
                    {metodosConRecargo.map((metodo) => (
                    <div className='text-violet-500 flex gap-1 items-center justify-end'>
                      <span className='font-medium'>{detalle.precios_por_metodo[metodo.id_tipos_de_pago] 
                      && detalle.cantidad ? detalle.precios_por_metodo[metodo.id_tipos_de_pago] * detalle.cantidad : 0}$</span>
                      <PaymentIcon paymentId={metodo.id_tipos_de_pago} height={16}/>
                    </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default RemitoCard;
