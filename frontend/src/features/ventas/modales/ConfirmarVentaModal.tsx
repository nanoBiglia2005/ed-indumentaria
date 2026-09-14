import type { ImportesPorMetodo, TIPOS_DE_PAGO } from '@backend/types';
import type { ArticuloDeVenta } from '@/types/ventas';
import BaseModal from '@/components/ui/BaseModal';
import { estiloLineClamp, formatearPesos } from '@/utils/formato';
import type { ClienteDeVenta } from '@/features/ventas/cliente/useClienteDeVenta';
import { telefonoLegible } from '@/features/ventas/cliente/formatoCliente';
import PaymentIcon from '@/components/ui/PaymentIcon';

const MAX_LINEAS_DESCRIPCION = 2;

/**
 * Columnas del repaso de articulos: articulo | cantidad | subtotal.
 * Compartida entre encabezado y filas para que los rotulos queden alineados.
 * El subtotal conserva el ancho de antes (5rem) como MINIMO, asi un importe
 * largo agranda la columna en vez de recortarse.
 */
const COLUMNAS = 'grid grid-cols-[minmax(0,1fr)_2.5rem_minmax(5rem,auto)] items-center gap-3 px-3';

export interface LineaVenta {
  articulo: ArticuloDeVenta;
  cantidad: number | null;
}

interface ConfirmarVentaModalProps {
  abierto: boolean;
  productos: LineaVenta[];
  cliente: ClienteDeVenta;
  total: number;
  /** Total con cada metodo de pago, por id_tipos_de_pago. */
  totalesPorMetodo: ImportesPorMetodo;
  /** Solo los metodos con recargo: el que no tiene cobra el precio base. */
  metodos: TIPOS_DE_PAGO[];
  /** Se esta registrando la venta (el boton de confirmar queda en curso). */
  cargando: boolean;
  /** true = confirmar tambien imprime el ticket. */
  conImpresion: boolean;
  /** Nombre de la impresora de destino; null si el usuario no elige (empleado). */
  nombreImpresora?: string | null;
  onCerrar: () => void;
  onConfirmar: () => void;
}

/**
 * Ultimo paso antes de registrar la venta: se repasa que se vende, a quien y
 * por cuanto. Los datos del cliente que se muestran son los del FORMULARIO (no
 * los de la base), porque es lo que va a quedar guardado al confirmar.
 */
export default function ConfirmarVentaModal({
  abierto,
  productos,
  cliente,
  total,
  totalesPorMetodo,
  metodos,
  cargando,
  conImpresion,
  nombreImpresora = null,
  onCerrar,
  onConfirmar,
}: ConfirmarVentaModalProps) {
  const { asignado, borrador, hayCambios } = cliente;
  const telefono = telefonoLegible(borrador);

  return (
    <BaseModal
      abierto={abierto}
      onCerrar={cargando ? () => {} : onCerrar}
      titulo='¿Desea confirmar esta Venta?'
      claseTitulo='text-2xl font-semibold leading-7 text-neutro-900 mb-5 text-center'
      ancho='2xl'
      z='z-[60]'
      clasePanel='select-none'
      footer={
        <div className='flex w-full flex-col gap-3'>
          {conImpresion && nombreImpresora && (
            <p className='text-center text-sm text-neutro-600'>
              Se imprime en <span className='font-semibold text-neutro-900'>{nombreImpresora}</span>
            </p>
          )}
          <div className='flex w-full flex-col gap-3 sm:flex-row'>
            <button
              type='button'
              onClick={onCerrar}
              disabled={cargando}
              className='flex-1 px-4 py-2 text-sm font-medium text-neutro-600 border border-neutro-200 rounded hover:bg-neutro-50 transition-colors cursor-pointer disabled:opacity-60'
            >
              Cancelar
            </button>
            <button
              type='button'
              onClick={onConfirmar}
              disabled={cargando}
              className='flex-1 px-4 py-2 text-sm font-medium text-white bg-marca-500 rounded hover:bg-marca-600 disabled:bg-marca-400 disabled:cursor-not-allowed transition-colors cursor-pointer'
            >
              {cargando ? (conImpresion ? 'Imprimiendo...' : 'Registrando...') : 'Confirmar'}
            </button>
          </div>
        </div>
      }
    >
      <div className='grid grid-cols-1 gap-5 sm:grid-cols-5'>
        <div className='sm:col-span-3 max-h-64 overflow-y-auto rounded border border-neutro-200 divide-y divide-neutro-100'>
          {productos.length > 0 && (
            /* Encabezado de columnas con LA MISMA plantilla que las filas
               (`COLUMNAS`): es lo que hace que "Cant." y "Subtotal" caigan
               sobre sus valores. Sticky porque la lista scrollea. */
            <div
              className={`${COLUMNAS} sticky top-0 z-10 bg-white py-2 text-[10px] font-semibold uppercase tracking-wide text-neutro-400`}
            >
              <span>Artículo / precio unitario</span>
              <span className='text-center'>Cant.</span>
              <span className='text-right'>Subtotal</span>
            </div>
          )}
          {productos.map(({ articulo, cantidad }) => (
            <div key={articulo.id_articulo} className={`${COLUMNAS} py-2`}>
              <div className='min-w-0 flex flex-col text-left'>
                <span
                  className='text-sm font-semibold text-neutro-900 break-words'
                  style={estiloLineClamp(MAX_LINEAS_DESCRIPCION)}
                >
                  {articulo.descripcion ?? 'Sin Nombre'}
                </span>
                <div className='flex flex-wrap items-center gap-x-2'>
                  <div className='flex gap-1 items-center' title='Precio del Articulo en Efectivo'>
                    <PaymentIcon paymentId={1} height={15}/>
                    <span className='text-xs font-medium text-neutro-600'>{formatearPesos(articulo.precio)}</span>
                  </div>   
                  {metodos.map((metodo) => (
                    <span
                      key={metodo.id_tipos_de_pago}
                      className='text-xs font-medium text-marca-500 flex gap-1 items-center'
                      title={`Precio del Articulo en ${metodo.nombre_tipo_de_pago}`}
                    >
                      <PaymentIcon paymentId={metodo.id_tipos_de_pago} height={15}/>
                      <span>{formatearPesos(articulo.precios_por_metodo?.[metodo.id_tipos_de_pago] ?? 0)}</span>
                    </span>
                  ))}
                </div>
              </div>
              <span className='text-sm text-center text-neutro-600'>x{cantidad ?? 0}</span>
              <span className='text-sm font-semibold'>
                <span className='flex gap-1 justify-end items-center text-neutro-900'>
                  <span>{formatearPesos((articulo.precio * (cantidad ?? 0)))}</span>
                  <PaymentIcon paymentId={1} height={18}/>
                </span>
                {metodos.map((metodo) => (
                    <span
                      key={metodo.id_tipos_de_pago}
                      className='text-marca-500 flex gap-1 items-center justify-end'
                      title={`Total del Articulo en ${metodo.nombre_tipo_de_pago}`}
                    > 
                      <span>{formatearPesos((articulo.precios_por_metodo?.[metodo.id_tipos_de_pago] * (cantidad ?? 0)))}</span>
                      <PaymentIcon paymentId={metodo.id_tipos_de_pago} height={18}/>
                    </span>
                  ))}
              </span>
            </div>
          ))}
        </div>

        <div className='sm:col-span-2 flex flex-col gap-4'>
          <div>
            <p className='text-lg font-semibold text-neutro-900'>Cliente</p>

            {asignado ? (
              <div className='mt-1 flex flex-col gap-2'>
                <div className='flex flex-col'>
                  <span className='text-xs text-neutro-400'>Nombre</span>
                  <span className='text-sm font-semibold text-neutro-900 break-words'>
                    {`${borrador.nombre.trim()} ${borrador.apellido.trim()}`.trim()}
                  </span>
                </div>
                <div className='flex flex-col'>
                  <span className='text-xs text-neutro-400'>DNI</span>
                  <span className='text-sm font-semibold text-neutro-900'>{borrador.dni}</span>
                </div>
                {telefono !== '' && (
                  <div className='flex flex-col'>
                    <span className='text-xs text-neutro-400'>Teléfono</span>
                    <span className='text-sm font-semibold text-neutro-900'>{telefono}</span>
                  </div>
                )}

                {hayCambios && (
                  <p className='rounded border border-acento-500 bg-acento-100 px-2 py-1 text-xs text-acento-800'>
                    Al confirmar se actualizan los datos editados del cliente.
                  </p>
                )}
              </div>
            ) : (
              <p className='mt-1 text-sm italic text-neutro-400'>Sin cliente asignado</p>
            )}
          </div>

          <div className='mt-auto border-t border-neutro-200 pt-3'>
            <p className='text-lg text-neutro-600'>Total</p>
            <span className='flex gap-1 items-center text-3xl font-bold text-neutro-900 break-words'>
              <PaymentIcon paymentId={1} height={35}/>
              <span>{formatearPesos(total)}</span>
            </span>
            {metodos.map((metodo) => (
              <span
                key={metodo.id_tipos_de_pago}
                className='flex gap-1 items-center text-3xl font-bold text-marca-700 break-words'
                title={`Total con ${metodo.nombre_tipo_de_pago}`}
              >
                <PaymentIcon paymentId={metodo.id_tipos_de_pago} height={35}/>
                <span>{formatearPesos(totalesPorMetodo[metodo.id_tipos_de_pago] ?? 0)}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </BaseModal>
  );
}
