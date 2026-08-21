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
const COLOR_POR_ESTADO: Record<number, string> = {
  [ESTADO_CONFIRMADO]: 'orange-500',
  [ESTADO_FACTURADO]: 'violet-500',
  [ESTADO_ANULADO]: 'amber-500',
  [ESTADO_DEVUELTO]: 'red-500',
};

const PALABRA_POR_ESTADO: Record<number, string> = {
  [ESTADO_CONFIRMADO]: 'Confirmada',
  [ESTADO_FACTURADO]: 'Paga',
  [ESTADO_ANULADO]: 'Anulada',
  [ESTADO_DEVUELTO]: 'Devuelta',
};

interface RemitoCardProps {
  remito: RemitoConDetalles;
  /** Metodos de pago, para rotular cada total mientras no este cobrado. */
  metodos?: TIPOS_DE_PAGO[];
  /** Controlado por el padre: asi solo puede haber una tarjeta abierta a la vez. */
  abierto: boolean;
  onToggle: () => void;
  /** Si se pasan, aparecen los botones en el encabezado del detalle. */
  onPagar?: (remito: RemitoConDetalles) => void;
  onAnular?: (remito: RemitoConDetalles) => void;
}

function RemitoCard({
  remito,
  metodos = [],
  abierto,
  onToggle,
  onPagar,
  onAnular,
}: RemitoCardProps) {
  const metodosConRecargo = metodos.filter((metodo) => metodo.recargo > 0);

  const color = COLOR_POR_ESTADO[remito.id_estado ?? ESTADO_FACTURADO] ?? 'violet-500';
  const palabra = PALABRA_POR_ESTADO[remito.id_estado ?? ESTADO_FACTURADO] ?? 'Desconocido';
  const hayAcciones = Boolean(onPagar || onAnular);

  // shrink-0: dentro de la lista en columna, si no, las tarjetas se aplastan
  // en vez de dejar scrollear cuando hay muchas ventas.
  return (
    <div className={`w-full shrink-0 border border-${color} rounded-xl shadow select-none overflow-hidden`}>
      <button
        type='button'
        onClick={onToggle}
        className='w-full flex items-center justify-between gap-4 pe-5 cursor-pointer text-left hover:bg-amber-50 transition-color duration-100 ease-in'
      > 
        <div className={`flex gap-3 items-center text-${color}`}>
          <span className={`text-3xl font-bold px-5 py-3 ${abierto ? ('text-white bg-' + color) : 'text' + color} transition-color duration-100 ease-in border-e-1`}>
            <p>{remito.cod_mes}-{remito.cod_remito_final}</p>
          </span>
          
          {remito.id_estado !== ESTADO_CONFIRMADO ? (
            <div className='flex items-center gap-x-5'>
              <span className='text-xl font-bold w-25'>{remito.total_final ?? remito.total_efectivo}$</span>
              <div className='flex flex-col w-18'>
                <span className='text-xs text-gray-400'>Estado</span>
                <span className='font-semibold'>{palabra}</span> 
              </div>
              <div className='flex flex-col'>
                <span className='text-xs text-gray-400'>Fecha de Emisión</span>
                <span className='text-black font-medium'>{formatearFecha(remito.fecha_de_emision)}</span>
            </div>
            </div>
          ) : (
            <div className='flex flex-col w-26'>
              <span className='font-semibold text-gray-900 flex gap-1 items-center'>
                <PaymentIcon paymentId={1} height={18}/>
                {remito.total_efectivo ?? 0}$         
              </span>
              {metodosConRecargo.map((metodo) => (
                <span
                  key={metodo.id_tipos_de_pago}
                  className='font-semibold text-violet-600 flex gap-1 items-center'
                  title={`Total con ${metodo.nombre_tipo_de_pago}`}
                >
                  <PaymentIcon paymentId={metodo.id_tipos_de_pago} height={18}/>
                  {remito.totales_por_metodo?.[metodo.id_tipos_de_pago] ?? 0}$ 
                </span>
              ))}
            </div>
          )}  
          <div className='flex flex-col'>
            <span className='text-xs text-gray-400'>Fecha de Creación</span>
            <span className='text-black font-medium'>{formatearFecha(remito.fecha_de_creacion)}</span>
          </div>
          <div className='flex flex-col'>
            <span className='text-xs text-gray-400'>Cliente</span>
            <span className='text-black font-medium'>{remito.CLIENTES ? remito.CLIENTES.nombre + ' ' +remito.CLIENTES.apellido : 'No Asignado'}</span>
          </div>
        </div>
        <div className='flex items-center gap-4 shrink-0'>
        {hayAcciones && abierto && (
          <div className='flex items-center justify-end gap-2'>
            {onPagar && (
              <button
                type='button'
                onClick={() => onPagar(remito)}
                className='rounded border border-violet-500 bg-violet-500 px-3 py-1 font-semibold text-white cursor-pointer transition-color duration-100 ease-in hover:bg-violet-600 active:bg-violet-700'
              >
                Pagar Remito
              </button>
            )}
            {onAnular && (
              <button
                type='button'
                onClick={() => onAnular(remito)}
                className='rounded border border-red-500 px-3 py-1 font-semibold text-red-600 cursor-pointer transition-color duration-100 ease-in hover:bg-red-500 hover:text-white'
              >
                Anular Remito
              </button>
            )}
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
        className={`overflow-y-auto transition-all duration-200 ease-in-out ${
          abierto ? 'max-h-60 border-black/10 border-t' : 'max-h-0'
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
