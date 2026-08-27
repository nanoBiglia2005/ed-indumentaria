import type { RemitoConDetalles, TIPOS_DE_PAGO } from '@backend/types';
import {
  ESTADO_ANULADO,
  ESTADO_CONFIRMADO,
  ESTADO_DEVUELTO,
  ESTADO_FACTURADO,
} from '@backend/types';
import { formatearFecha, formatearPesos } from '@/utils/formato';
import PaymentIcon from '@/components/ui/PaymentIcon';

/**
 * Color segun el estado del remito (tabla ESTADOS_REMITOS).
 *
 * Las clases van ENTERAS y no armadas como `'text-' + color`: Tailwind escanea
 * el codigo buscando nombres de clase completos, asi que una clase concatenada
 * no se genera nunca. Si alguna parecia funcionar era de rebote, porque ese
 * mismo texto literal aparecia en otro archivo.
 */
type EstiloDeEstado = { borde: string; texto: string; fondo: string };

const ESTILO_POR_ESTADO: Record<number, EstiloDeEstado> = {
  [ESTADO_CONFIRMADO]: {
    borde: 'border-orange-400',
    texto: 'text-orange-400',
    fondo: 'bg-orange-400',
  },
  [ESTADO_FACTURADO]: {
    borde: 'border-violet-500',
    texto: 'text-violet-500',
    fondo: 'bg-violet-500',
  },
  [ESTADO_ANULADO]: {
    borde: 'border-gray-500',
    texto: 'text-gray-500',
    fondo: 'bg-gray-500',
  },
  [ESTADO_DEVUELTO]: {
    borde: 'border-red-500',
    texto: 'text-red-500',
    fondo: 'bg-red-500',
  },
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
  /** Solo se ofrece sobre ventas FACTURADAS (ver `puedeDevolver`). */
  onDevolver?: (remito: RemitoConDetalles) => void;
}

function RemitoCard({
  remito,
  metodos = [],
  abierto,
  onToggle,
  onPagar,
  onAnular,
  onDevolver,
}: RemitoCardProps) {
  const metodosConRecargo = metodos.filter((metodo) => metodo.recargo > 0);

  const estilo =
    ESTILO_POR_ESTADO[remito.id_estado ?? ESTADO_FACTURADO] ?? ESTILO_POR_ESTADO[ESTADO_FACTURADO];
  const palabra = PALABRA_POR_ESTADO[remito.id_estado ?? ESTADO_FACTURADO] ?? 'Desconocido';
  // Devolver solo tiene sentido sobre una venta ya cobrada: la lista del
  // historial mezcla estados, asi que se filtra por remito y no por pagina.
  const puedeDevolver = Boolean(onDevolver) && remito.id_estado === ESTADO_FACTURADO;
  const hayAcciones = Boolean(onPagar || onAnular) || puedeDevolver;

  // shrink-0: dentro de la lista en columna, si no, las tarjetas se aplastan
  // en vez de dejar scrollear cuando hay muchas ventas.
  return (
    <div className={`w-full shrink-0 border ${estilo.borde} rounded-xl shadow select-none overflow-hidden`}>
      <button
        type='button'
        onClick={onToggle}
        className='w-full flex items-center justify-between gap-4 pe-5 cursor-pointer text-left hover:bg-amber-50 transition-colors duration-100 ease-in'
      > 
        <div className={`flex gap-3 items-center ${estilo.texto}`}>
          <span className={`text-2xl font-bold px-5 py-3 ${abierto ? `text-white ${estilo.fondo}` : estilo.texto} transition-colors duration-100 ease-in border-e-1`}>
            <p>{remito.cod_mes}-{remito.cod_remito_final}</p>
          </span>
          
          {remito.id_estado !== ESTADO_CONFIRMADO ? (
            <div className='flex items-center gap-x-5'>
              <span className='text-xl font-bold w-29'>{formatearPesos(remito.total_final ?? remito.total_efectivo)}</span>
              <div className='flex flex-col w-18'>
                <span className={`text-xs ${estilo.texto}`}>Estado</span>
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
                {formatearPesos(remito.total_efectivo) ?? 0}         
              </span>
              {metodosConRecargo.map((metodo) => (
                <span
                  key={metodo.id_tipos_de_pago}
                  className='font-semibold text-violet-600 flex gap-1 items-center'
                  title={`Total con ${metodo.nombre_tipo_de_pago}`}
                >
                  <PaymentIcon paymentId={metodo.id_tipos_de_pago} height={18}/>
                  {formatearPesos(remito.totales_por_metodo?.[metodo.id_tipos_de_pago]) ?? 0} 
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
        {/* Los botones se montan SIEMPRE (si no, no habria nada que animar) y lo
            que se anima es el ancho de la columna.

            0fr -> 1fr y no max-w-0 -> max-w-[N]: con max-w hay que elegir un
            tope fijo, y como es mas grande que los botones la animacion termina
            a mitad de camino y se ve como un salto. `1fr` mide el ancho real,
            asi que el tiempo es el mismo con uno o con dos botones. */}
        {hayAcciones && (
          <div
            className={`grid transition-[grid-template-columns] duration-300 ease-out ${
              abierto ? 'grid-cols-[1fr]' : 'grid-cols-[0fr]'
            }`}
          >
            {/* justify-end mantiene los botones pegados al borde derecho y deja
                que lo que todavia no entra se recorte por la IZQUIERDA: de ahi
                que aparezcan de derecha a izquierda. */}
            <div className='flex justify-end overflow-hidden'>
              {/* La duracion cambia con `abierto`, que es lo que permite que el
                  fundido no compita con el barrido de arriba:

                  al ABRIR va mas lento que el ancho (500 vs 300) asi el fundido
                  se sigue viendo despues de que los botones terminaron de
                  destaparse; al CERRAR va mas rapido (150) para que alcancen a
                  desvanecerse antes de que el recorte se los coma. */}
              <div
                className={`flex items-center gap-2 shrink-0 transition-opacity ease-out ${
                  abierto ? 'opacity-100 duration-500' : 'opacity-0 duration-150'
                }`}
              >
                {onPagar && (
                  <div
                    onClick={() => onPagar(remito)}
                    className='rounded border border-violet-500 bg-violet-500 px-3 py-1 font-semibold text-white cursor-pointer transition-colors duration-100 ease-in hover:bg-violet-600 active:bg-violet-700'
                  >
                    Pagar Remito
                  </div>
                )}
                {onAnular && (
                  <div
                    onClick={() => onAnular(remito)}
                    className='rounded border border-red-500 px-3 py-1 font-semibold text-red-600 cursor-pointer transition-colors duration-100 ease-in hover:bg-red-500 hover:text-white'
                  >
                    Anular Remito
                  </div>
                )}
                {puedeDevolver && (
                  <div
                    onClick={() => onDevolver?.(remito)}
                    className='rounded border border-red-500 px-3 py-1 font-semibold hover:bg-red-600 cursor-pointer transition-colors duration-100 ease-in bg-red-500 text-white'
                  >
                    Devolver Venta
                  </div>
                )}
              </div>
            </div>
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
                      <span className='text-gray-500'>{formatearPesos(detalle.precio ?? 0)}</span>
                    </div> 
                    {metodosConRecargo.map((metodo) => (
                      <div className='text-violet-500 flex gap-1 items-center min-w-18' key={metodo.id_tipos_de_pago}>
                        <PaymentIcon paymentId={metodo.id_tipos_de_pago} height={16}/>
                        <span>{formatearPesos(detalle.precios_por_metodo[metodo.id_tipos_de_pago])}</span>
                      </div>
                    ))}
                  </div>       
                </div>     
                <div className='flex items-center gap-4 shrink-0 text-gray-600'>
                  <span>x{detalle.cantidad}</span>
                  <div className='flex-col text-md'>
                    <div className='flex gap-1 items-center text-black justify-end'>
                      <span className='font-medium'>{formatearPesos(detalle.precio && detalle.cantidad ? detalle.precio * detalle.cantidad : 0)}</span>
                      <PaymentIcon paymentId={1} height={16}/>
                    </div>
                    {metodosConRecargo.map((metodo) => (
                    <div className='text-violet-500 flex gap-1 items-center justify-end' key={metodo.id_tipos_de_pago}>
                      <span className='font-medium'>{formatearPesos(detalle.precios_por_metodo[metodo.id_tipos_de_pago] 
                      && detalle.cantidad ? detalle.precios_por_metodo[metodo.id_tipos_de_pago] * detalle.cantidad : 0)}</span>
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
