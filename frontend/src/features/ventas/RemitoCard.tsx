import type { RemitoConDetalles, TIPOS_DE_PAGO } from '@backend/types';
import { ESTADO_CONFIRMADO, ESTADO_FACTURADO } from '@backend/types';
import { formatearFecha, formatearPesos } from '@/utils/formato';
import PaymentIcon from '@/components/ui/PaymentIcon';
import { estiloDeEstado, ANCHOS_REMITO_CARD_POR_DEFECTO } from './estadosRemito';
import DetalleArticulosRemito from './DetalleArticulosRemito';

interface RemitoCardProps {
  remito: RemitoConDetalles;
  /** Metodos de pago, para rotular cada total mientras no este cobrado. */
  metodos?: TIPOS_DE_PAGO[];
  /** Controlado por el padre: asi solo puede haber una tarjeta abierta a la vez. */
  abierto: boolean;
  /** Despliega el detalle inline. Solo se usa en los remitos CONFIRMADOS. */
  onToggle: () => void;
  /**
   * Abre la ficha completa en un modal. Es lo que hace el click en cualquier
   * remito que NO este CONFIRMADO: esos ya no se despliegan inline.
   */
  onAbrirDetalle?: (remito: RemitoConDetalles) => void;
  /** Si se pasan, aparecen los botones en el encabezado del detalle. */
  onPagar?: (remito: RemitoConDetalles) => void;
  onAnular?: (remito: RemitoConDetalles) => void;
  /** Solo se ofrece sobre ventas FACTURADAS (ver `puedeDevolver`). */
  onDevolver?: (remito: RemitoConDetalles) => void;
  /** Solo sobre ventas vigentes (ver `puedeReimprimir`): una anulada no se reimprime. */
  onReimprimir?: (remito: RemitoConDetalles) => void;
  /**
   * Navega a la venta en Ventas/Historial (la usa VentasDeCliente, en la ficha
   * de un cliente). A diferencia de las demas acciones, no depende del estado
   * del remito: siempre se ofrece si se pasa.
   */
  onVerVenta?: (remito: RemitoConDetalles) => void;
  /**
   * Oculta la columna Cliente. La usa VentasDeCliente (panel de ficha en
   * Clientes): ahi el cliente ya es el contexto de toda la pantalla, repetirlo
   * en cada tarjeta es ruido.
   */
  mostrarCliente?: boolean;
  /**
   * Ancho (px) de las columnas de valor variable, calculado por ListaDeRemitos
   * segun el remito mas ancho VISIBLE (ver MedidorAnchosRemitoCard) — asi
   * quedan alineadas entre tarjetas sin volver a un ancho fijo pensado para el
   * peor caso.
   */
  anchoCodigo?: number;
  anchoMonto?: number;
  anchoEstado?: number;
  anchoCliente?: number;
  anchoFechaEmision?: number;
  anchoFechaCreacion?: number;
}

function RemitoCard({
  remito,
  metodos = [],
  abierto,
  onToggle,
  onAbrirDetalle,
  onPagar,
  onAnular,
  onDevolver,
  onReimprimir,
  onVerVenta,
  mostrarCliente = true,
  anchoCodigo = ANCHOS_REMITO_CARD_POR_DEFECTO.codigo,
  anchoMonto = ANCHOS_REMITO_CARD_POR_DEFECTO.total,
  anchoEstado = ANCHOS_REMITO_CARD_POR_DEFECTO.estado,
  anchoCliente = ANCHOS_REMITO_CARD_POR_DEFECTO.cliente,
  anchoFechaEmision = ANCHOS_REMITO_CARD_POR_DEFECTO.fecha_emision,
  anchoFechaCreacion = ANCHOS_REMITO_CARD_POR_DEFECTO.fecha_creacion,
}: RemitoCardProps) {
  const metodosConRecargo = metodos.filter((metodo) => metodo.recargo > 0);
  // Metodos con los que se cobro EFECTIVAMENTE el remito (puede haber mas de
  // uno en un pago mixto). Un remito Confirmado todavia no tiene filas en
  // PAGOS_REMITO (se crean recien al facturar, ver services/pagosRemito.js),
  // por eso este dato solo aplica al bloque no-Confirmado de abajo.
  const idsMetodosPagados = [...new Set(remito.PAGOS_REMITO.map((pago) => pago.id_tipo_de_pago))];

  const { estilo, palabra } = estiloDeEstado(remito.id_estado);

  /**
   * Una venta ya cerrada (facturada / anulada / devuelta) se consulta entera en
   * DetalleRemitoModal: el desplegable inline queda solo para las CONFIRMADAS,
   * que es donde se cobra o se anula sin salir de la lista.
   *
   * Sin `onAbrirDetalle` (RemitoDestacado, VentasDeCliente) la tarjeta se sigue
   * comportando como antes: no hay modal al que mandar el click, y quedarse sin
   * forma de ver los articulos seria peor.
   */
  const usaModal = remito.id_estado !== ESTADO_CONFIRMADO && Boolean(onAbrirDetalle);

  const puedeDevolver = Boolean(onDevolver) && remito.id_estado === ESTADO_FACTURADO;
  const puedeReimprimir =
    Boolean(onReimprimir) &&
    (remito.id_estado === ESTADO_CONFIRMADO || remito.id_estado === ESTADO_FACTURADO);
  const hayAcciones =
    !usaModal &&
    (Boolean(onPagar || onAnular || onVerVenta) || puedeDevolver || puedeReimprimir);

  /**
   * Los anchos medidos viajan como custom properties en vez de `style.width`
   * / `style.minWidth` porque un estilo inline no entiende de breakpoints: un
   * `md:w-[var(--ancho-codigo)]` si puede activarse solo desde `md`, mientras
   * que `style={{minWidth: anchoCodigo}}` gana siempre sin importar el ancho
   * de pantalla.
   */
  const variablesDeAncho = {
    '--ancho-codigo': `${anchoCodigo}px`,
    '--ancho-estado': `${anchoEstado}px`,
    '--ancho-monto': `${anchoMonto}px`,
    '--ancho-cliente': `${anchoCliente}px`,
    '--ancho-fecha-emision': `${anchoFechaEmision}px`,
    '--ancho-fecha-creacion': `${anchoFechaCreacion}px`,
  } as React.CSSProperties;

  // shrink-0: dentro de la lista en columna, si no, las tarjetas se aplastan
  // en vez de dejar scrollear cuando hay muchas ventas.
  return (
    <div
      style={variablesDeAncho}
      className={`w-full shrink-0 border ${estilo.borde} rounded select-none overflow-hidden`}
    >
      <button
        type='button'
        onClick={usaModal ? () => onAbrirDetalle?.(remito) : onToggle}
        className='w-full flex items-center justify-between pe-5 cursor-pointer text-left hover:bg-neutro-100 transition-colors duration-100 ease-in'
      > 
        <div className={`flex gap-3 items-center min-w-0 overflow-x-auto ${estilo.texto}`}>
          <span
            className={`text-2xl md:min-w-[var(--ancho-codigo)] min-w-30 font-bold md:px-5 px-2 py-3 text-center ${abierto ? `text-white ${estilo.fondo}` : estilo.texto} transition-colors duration-100 ease-in border-e-1`}
          >
            <p>{remito.cod_mes}-{remito.cod_remito_final}</p>
            {remito.id_estado === ESTADO_CONFIRMADO && (
              <div className='flex md:hidden flex-col whitespace-nowrap'>
                <span className={`font-medium transition-colors duration-100 ease-in ${!remito.fecha_de_creacion ? 'text-neutro-900 text-sm' : `${abierto ? `text-white ${estilo.fondo}` : 'text-neutro-600'} text-sm md:text-md`}`}>{formatearFecha(remito.fecha_de_creacion)}</span>
              </div>
              )}
            {remito.id_estado !== ESTADO_CONFIRMADO && (
            <div className={`flex items-center px-2 md:hidden justify-center`}>
              <span
                className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-xs font-bold text-white ${estilo.fondo}`}
              >
                {palabra}
              </span>
            </div>
          )}
          </span>

          {/* Estado como pill de color: es el dato mas escaneable de un vistazo
              (junto con codigo y total), no un dato mas apilado como fecha o
              cliente — de ahi que vaya justo despues del codigo, antes del
              total, y no como texto chico con label. */}
          {remito.id_estado !== ESTADO_CONFIRMADO && (
            <div className='hidden md:flex items-center px-2 xl:min-w-[var(--ancho-estado)] min-w-22'>
              <span
                className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-xs font-bold text-white ${estilo.fondo}`}
              >
                {palabra}
              </span>
            </div>
          )}

          {remito.id_estado !== ESTADO_CONFIRMADO ? (
            <div className='flex flex-col'>
              <span style={{ minWidth: anchoMonto }} className='text-xl font-bold px-2 flex gap-1 items-center'>
                {/* Metodos REALMENTE cobrados (PAGOS_REMITO), a diferencia del
                    bloque CONFIRMADO de abajo que muestra el precio segun cada
                    metodo POSIBLE antes de que se elija ninguno. */}
                <div className='flex flex-col'>
                  {idsMetodosPagados.map((idMetodo) => (
                    <PaymentIcon key={idMetodo} paymentId={idMetodo} height={18}/>
                  ))}
                </div>
                {formatearPesos(remito.total_final ?? remito.total_efectivo)}
              </span>
              <div className='flex flex-col px-2 whitespace-nowrap md:hidden'>
                <span className='text-xs text-neutro-400'>Cliente</span>
                <span className={`text-black text-[12px] font-medium`}>{remito.CLIENTES ? remito.CLIENTES.nombre + ' ' +remito.CLIENTES.apellido : 'No Asignado'}</span>
              </div> 
            </div>
          ) : (
            <div style={{ minWidth: anchoMonto }} className='flex flex-col px-2'>
              <span className='font-semibold text-neutro-900 flex gap-1 items-center'>
                <PaymentIcon paymentId={1} height={18}/>
                {formatearPesos(remito.total_efectivo) ?? 0}
              </span>
              {metodosConRecargo.map((metodo) => (
                <span
                  key={metodo.id_tipos_de_pago}
                  className='font-semibold text-marca-600 flex gap-1 items-center'
                  title={`Total con ${metodo.nombre_tipo_de_pago}`}
                >
                  <PaymentIcon paymentId={metodo.id_tipos_de_pago} height={18}/>
                  {formatearPesos(remito.totales_por_metodo?.[metodo.id_tipos_de_pago]) ?? 0}
                </span>
              ))}
            </div>
          )}

          {remito.id_estado !== ESTADO_CONFIRMADO && (
            <div className='md:flex hidden flex-col px-2 whitespace-nowrap xl:min-w-30'>
              <span className='text-xs text-neutro-400'>Fecha de Emisión</span>
              <span className={`font-medium ${!remito.fecha_de_emision ? 'text-neutro-400' : 'text-black text-sm md:text-md'}`}>{formatearFecha(remito.fecha_de_emision)}</span>
            </div>
          )}
          <div className={`flex-col px-2 whitespace-nowrap ${remito.id_estado === ESTADO_CONFIRMADO ? 'md:flex hidden' : 'flex'}`}>
            <div className='flex flex-col xl:min-w-30'>
              <span className='md:text-xs text-[10px] text-neutro-400'>Fecha de Creación</span>
              <span className={`font-medium ${!remito.fecha_de_creacion ? 'text-neutro-400' : 'text-black text-sm md:text-md'}`}>{formatearFecha(remito.fecha_de_creacion)}</span>    
            </div>
            {remito.id_estado !== ESTADO_CONFIRMADO && (
            <div className='flex md:hidden flex-col whitespace-nowrap xl:min-w-[var(--ancho-fecha-emision)]'>
              <span className='md:text-xs text-[10px] text-neutro-400'>Fecha de Emisión</span>
              <span className={`font-medium ${!remito.fecha_de_emision ? 'text-neutro-400' : 'text-black text-sm md:text-md'}`}>{formatearFecha(remito.fecha_de_emision)}</span>
            </div>
          )}
          </div>
          {mostrarCliente && (
            <div style={{ minWidth: anchoCliente }} className={`
            ${remito.id_estado !== ESTADO_CONFIRMADO ? 'md:flex hidden' : 'flex'} flex-col px-2 whitespace-nowrap`}>
              <span className='text-xs text-neutro-400'>Cliente</span>
              <span className={`text-black font-medium`}>{remito.CLIENTES ? remito.CLIENTES.nombre + ' ' +remito.CLIENTES.apellido : 'No Asignado'}</span>
            </div>
          )}
        </div>
        <div className='flex items-center shrink-0'>
        {/* Los botones se montan SIEMPRE (si no, no habria nada que animar) y lo
            que se anima es el ancho de la columna.

            0fr -> 1fr y no max-w-0 -> max-w-[N]: con max-w hay que elegir un
            tope fijo, y como es mas grande que los botones la animacion termina
            a mitad de camino y se ve como un salto. `1fr` mide el ancho real,
            asi que el tiempo es el mismo con uno o con dos botones. */}

          {hayAcciones && (
            <div
              className={`transition-[grid-template-columns] hidden xl:grid duration-300 ease-out ${
                abierto ? 'grid-cols-[1fr]' : 'grid-cols-[0fr]'
              }`}
            >
              {/* justify-end mantiene los botones pegados al borde derecho y deja
                  que lo que todavia no entra se recorte por la IZQUIERDA: de ahi
                  que aparezcan de derecha a izquierda. */}

              <div className='flex justify-start overflow-hidden xl:py-3 pt-3'>
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
                      className='rounded border border-marca-500 bg-marca-500 px-3 py-1 font-semibold text-white cursor-pointer transition-colors duration-100 ease-in hover:bg-marca-600 active:bg-marca-700'
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
                  {puedeReimprimir && (
                    <div
                      onClick={() => onReimprimir?.(remito)}
                      className='rounded border border-acento-500 px-3 py-1 font-semibold text-acento-600 cursor-pointer transition-colors duration-100 ease-in hover:bg-acento-500 hover:text-white'
                    >
                      Reimprimir
                    </div>
                  )}
                  {onVerVenta && (
                    <div
                      onClick={() => onVerVenta(remito)}
                      className='rounded border border-marca-500 px-3 py-1 font-semibold text-marca-600 cursor-pointer transition-colors duration-100 ease-in hover:bg-marca-500 hover:text-white'
                    >
                      Ver Venta
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {/* En los remitos que abren el modal la flecha apunta a la derecha y
              no gira: no hay nada que desplegar en la tarjeta, asi que animarla
              como si fuera a abrirse seria mentir sobre lo que hace el click. */}
          <svg
            className={`w-5 h-5 ms-2 text-neutro-400 transition-transform duration-200 ease-in-out ${
              usaModal ? '-rotate-90' : abierto ? 'rotate-180' : ''
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

      {/* Detalle inline: solo para los CONFIRMADOS. El resto lo ve en
          DetalleRemitoModal, que muestra esta misma tabla mas cliente y pagos. */}
      {!usaModal && (
      <div
        className={`overflow-y-auto transition-all duration-200 ease-in-out ${
          abierto ? 'max-h-60 border-black/10 border-t' : 'max-h-0'
        }`}
      >
        {hayAcciones && (
          <div
            className={`grid transition-[grid-template-columns] xl:hidden duration-300 ease-out ${
              abierto ? 'grid-cols-[1fr]' : 'grid-cols-[0fr]'
            }`}
          >
            {/* justify-end mantiene los botones pegados al borde derecho y deja
                que lo que todavia no entra se recorte por la IZQUIERDA: de ahi
                que aparezcan de derecha a izquierda. */}
            <div className='flex justify-start overflow-hidden ps-4 pt-3'>
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
                    className='rounded border border-marca-500 bg-marca-500 lg:px-3 text-sm lg:text-md px-2 py-1 font-semibold text-white cursor-pointer transition-colors duration-100 ease-in hover:bg-marca-600 active:bg-marca-700'
                  >
                    Pagar Remito
                  </div>
                )}
                {onAnular && (
                  <div
                    onClick={() => onAnular(remito)}
                    className='rounded border border-red-500 lg:px-3 text-sm lg:text-md px-2 py-1 font-semibold text-red-600 cursor-pointer transition-colors duration-100 ease-in hover:bg-red-500 hover:text-white'
                  >
                    Anular Remito
                  </div>
                )}
                {puedeDevolver && (
                  <div
                    onClick={() => onDevolver?.(remito)}
                    className='rounded border border-red-500 lg:px-3 text-sm lg:text-md px-2 py-1 font-semibold hover:bg-red-600 cursor-pointer transition-colors duration-100 ease-in bg-red-500 text-white'
                  >
                    Devolver Venta
                  </div>
                )}
                {puedeReimprimir && (
                  <div
                    onClick={() => onReimprimir?.(remito)}
                    className='rounded border border-acento-500 lg:px-3 text-sm lg:text-md px-2 py-1 font-semibold text-acento-600 cursor-pointer transition-colors duration-100 ease-in hover:bg-acento-500 hover:text-white'
                  >
                    Reimprimir
                  </div>
                )}
                {onVerVenta && (
                  <div
                    onClick={() => onVerVenta(remito)}
                    className='rounded border border-marca-500 lg:px-3 text-sm lg:text-md px-2 py-1 font-semibold text-marca-600 cursor-pointer transition-colors duration-100 ease-in hover:bg-marca-500 hover:text-white'
                  >
                    Ver Venta
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        <DetalleArticulosRemito
          detalles={remito.DETALLES_REMITO}
          metodosConRecargo={metodosConRecargo}
        />
      </div>
      )}
    </div>
  );
}

export default RemitoCard;
