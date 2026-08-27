import type { ImportesPorMetodo, TIPOS_DE_PAGO } from '@backend/types';
import type { ArticuloDeVenta } from '@/types/ventas';
import BaseModal from '@/components/ui/BaseModal';
import { estiloLineClamp, formatearPesos } from '@/utils/formato';
import type { ClienteDeVenta } from '@/features/ventas/cliente/useClienteDeVenta';
import { telefonoLegible } from '@/features/ventas/cliente/formatoCliente';
import PaymentIcon from '@/components/ui/PaymentIcon';

const MAX_LINEAS_DESCRIPCION = 2;

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
      claseTitulo='text-2xl font-semibold leading-7 text-gray-900 mb-5 text-center'
      ancho='2xl'
      z='z-[60]'
      clasePanel='select-none'
      footer={
        <div className='flex w-full flex-col gap-3 sm:flex-row'>
          <button
            type='button'
            onClick={onCerrar}
            disabled={cargando}
            className='flex-1 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-60'
          >
            Cancelar
          </button>
          <button
            type='button'
            onClick={onConfirmar}
            disabled={cargando}
            className='flex-1 px-4 py-2 text-sm font-medium text-white bg-violet-700 rounded-md hover:bg-violet-800 disabled:bg-violet-400 disabled:cursor-not-allowed transition-colors cursor-pointer'
          >
            {cargando ? (conImpresion ? 'Imprimiendo...' : 'Registrando...') : 'Confirmar'}
          </button>
        </div>
      }
    >
      <div className='grid grid-cols-1 gap-5 sm:grid-cols-5'>
        <div className='sm:col-span-3 max-h-64 overflow-y-auto rounded-md border border-gray-200 divide-y divide-gray-100'>
          {productos.map(({ articulo, cantidad }) => (
            <div key={articulo.id_articulo} className='flex items-center gap-3 px-3 py-2'>
              <div className='flex-1 min-w-0 flex flex-col text-left'>
                <span
                  className='text-sm font-semibold text-gray-800 break-words'
                  style={estiloLineClamp(MAX_LINEAS_DESCRIPCION)}
                >
                  {articulo.descripcion ?? 'Sin Nombre'}
                </span>
                <div className='flex flex-wrap items-center gap-x-2'>
                  <div className='flex gap-1 items-center' title='Precio del Articulo en Efectivo'>
                    <PaymentIcon paymentId={1} height={15}/>
                    <span className='text-xs font-medium text-gray-500'>{formatearPesos(articulo.precio)}</span>
                  </div>   
                  {metodos.map((metodo) => (
                    <span
                      key={metodo.id_tipos_de_pago}
                      className='text-xs font-medium text-violet-500 flex gap-1 items-center'
                      title={`Precio del Articulo en ${metodo.nombre_tipo_de_pago}`}
                    >
                      <PaymentIcon paymentId={metodo.id_tipos_de_pago} height={15}/>
                      <span>{formatearPesos(articulo.precios_por_metodo?.[metodo.id_tipos_de_pago] ?? 0)}</span>
                    </span>
                  ))}
                </div>
              </div>
              <span className='text-sm text-gray-500 shrink-0'>x{cantidad ?? 0}</span>
              <span className='text-sm font-semibold shrink-0 w-20'>
                <span className='flex gap-1 justify-end items-center text-gray-800'>
                  <span>{formatearPesos((articulo.precio * (cantidad ?? 0)))}</span>
                  <PaymentIcon paymentId={1} height={18}/>
                </span>
                {metodos.map((metodo) => (
                    <span
                      key={metodo.id_tipos_de_pago}
                      className='text-violet-500 flex gap-1 items-center justify-end'
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
            <p className='text-lg font-semibold text-gray-800'>Cliente</p>

            {asignado ? (
              <div className='mt-1 flex flex-col gap-2'>
                <div className='flex flex-col'>
                  <span className='text-xs text-gray-400'>Nombre</span>
                  <span className='text-sm font-semibold text-gray-800 break-words'>
                    {`${borrador.nombre.trim()} ${borrador.apellido.trim()}`.trim()}
                  </span>
                </div>
                <div className='flex flex-col'>
                  <span className='text-xs text-gray-400'>DNI</span>
                  <span className='text-sm font-semibold text-gray-800'>{borrador.dni}</span>
                </div>
                {telefono !== '' && (
                  <div className='flex flex-col'>
                    <span className='text-xs text-gray-400'>Teléfono</span>
                    <span className='text-sm font-semibold text-gray-800'>{telefono}</span>
                  </div>
                )}

                {hayCambios && (
                  <p className='rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-700'>
                    Al confirmar se actualizan los datos editados del cliente.
                  </p>
                )}
              </div>
            ) : (
              <p className='mt-1 text-sm italic text-gray-400'>Sin cliente asignado</p>
            )}
          </div>

          <div className='mt-auto border-t border-gray-200 pt-3'>
            <p className='text-lg text-gray-500'>Total</p>
            <span className='flex gap-1 items-center text-3xl font-bold text-gray-900 break-words'>
              <PaymentIcon paymentId={1} height={35}/>
              <span>{formatearPesos(total)}</span>
            </span>
            {metodos.map((metodo) => (
              <span
                key={metodo.id_tipos_de_pago}
                className='flex gap-1 items-center text-3xl font-bold text-violet-700 break-words'
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
