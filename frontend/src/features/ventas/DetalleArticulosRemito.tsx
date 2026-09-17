import type { DetalleRemitoConPrecios, TIPOS_DE_PAGO } from '@backend/types';
import { formatearPesos } from '@/utils/formato';
import PaymentIcon from '@/components/ui/PaymentIcon';

/**
 * Plantilla de columnas del detalle (articulo | cantidad | subtotal). La usan
 * el encabezado Y cada fila: es lo unico que garantiza que "Cant." y
 * "Subtotal" caigan sobre los valores que rotulan, porque el ancho del
 * contenido de cada fila varia (uno o varios metodos de pago con recargo).
 *
 * Las dos variantes van como clases LITERALES (no concatenadas) porque Tailwind
 * busca nombres de clase completos en el codigo. `compacto` achica el minimo de
 * la columna del articulo: dentro del modal, 300px empujaban scroll horizontal
 * en pantallas chicas.
 *
 * No se exportan: un modulo que exporta un componente no puede exportar ademas
 * constantes sueltas (react-refresh/only-export-components).
 */
const COLUMNAS = 'grid grid-cols-[minmax(300px,1fr)_3rem_minmax(7rem,auto)] items-center gap-3';
const COLUMNAS_COMPACTO =
  'grid grid-cols-[minmax(150px,1fr)_3rem_minmax(7rem,auto)] items-center gap-3';

interface DetalleArticulosRemitoProps {
  detalles: DetalleRemitoConPrecios[];
  /** Ya filtrados por `recargo > 0`: se muestra un renglon extra por cada uno. */
  metodosConRecargo: TIPOS_DE_PAGO[];
  /** Clases del contenedor scrolleable (el modal le pone un tope de alto). */
  claseContenedor?: string;
  /** Columna de articulo mas angosta, para contenedores estrechos (el modal). */
  compacto?: boolean;
}

/**
 * Los articulos de un remito con su precio unitario y su subtotal, en efectivo
 * y con cada metodo que tiene recargo.
 *
 * Compartido por el desplegable inline de RemitoCard (remitos CONFIRMADOS) y
 * por DetalleRemitoModal (el resto de los estados), que muestran exactamente la
 * misma tabla.
 */
export default function DetalleArticulosRemito({
  detalles,
  metodosConRecargo,
  claseContenedor = 'px-5 py-3 overflow-x-auto',
  compacto = false,
}: DetalleArticulosRemitoProps) {
  const columnas = compacto ? COLUMNAS_COMPACTO : COLUMNAS;

  if (detalles.length === 0) {
    return (
      <div className={claseContenedor}>
        <p className='text-sm text-neutro-400 italic py-2'>Sin artículos</p>
      </div>
    );
  }

  return (
    <div className={claseContenedor}>
      <div className='min-w-max divide-y divide-black/5'>
        <div
          className={`${columnas} pb-1 text-[10px] font-semibold uppercase tracking-wide text-neutro-400`}
        >
          <span>Artículo / precio unitario</span>
          <span className='text-center'>Cant.</span>
          <span className='text-right'>Subtotal</span>
        </div>
        {detalles.map((detalle) => (
          <div key={detalle.id_detalle} className={`${columnas} py-2 text-sm text-black`}>
            <div className='flex flex-col font-medium'>
              <span className='truncate'>
                {detalle.ARTICULOS?.descripcion ?? `Artículo ${detalle.id_articulo}`}
              </span>
              <div className='flex flex-wrap gap-x-3 gap-y-0.5'>
                <div className='flex gap-1 items-center min-w-18'>
                  <PaymentIcon paymentId={1} height={16} />
                  <span className='text-neutro-600'>{formatearPesos(detalle.precio ?? 0)}</span>
                </div>
                {metodosConRecargo.map((metodo) => (
                  <div
                    className='text-marca-500 flex gap-1 items-center min-w-18'
                    key={metodo.id_tipos_de_pago}
                  >
                    <PaymentIcon paymentId={metodo.id_tipos_de_pago} height={16} />
                    <span>{formatearPesos(detalle.precios_por_metodo[metodo.id_tipos_de_pago])}</span>
                  </div>
                ))}
              </div>
            </div>
            <span className='text-center text-neutro-600'>x{detalle.cantidad}</span>
            <div className='flex flex-col text-md'>
              <div className='flex gap-1 items-center text-black justify-end'>
                <span className='font-medium'>
                  {formatearPesos(
                    detalle.precio && detalle.cantidad ? detalle.precio * detalle.cantidad : 0
                  )}
                </span>
                <PaymentIcon paymentId={1} height={16} />
              </div>
              {metodosConRecargo.map((metodo) => (
                <div
                  className='text-marca-500 flex gap-1 items-center justify-end'
                  key={metodo.id_tipos_de_pago}
                >
                  <span className='font-medium'>
                    {formatearPesos(
                      detalle.precios_por_metodo[metodo.id_tipos_de_pago] && detalle.cantidad
                        ? detalle.precios_por_metodo[metodo.id_tipos_de_pago] * detalle.cantidad
                        : 0
                    )}
                  </span>
                  <PaymentIcon paymentId={metodo.id_tipos_de_pago} height={16} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
