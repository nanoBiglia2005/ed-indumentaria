import type { ARTICULOS } from '@backend/types';
import BaseModal from '@/components/ui/BaseModal';
import { estiloLineClamp } from '@/utils/formato';
import type { ClienteDeVenta } from '@/features/ventas/cliente/useClienteDeVenta';
import { telefonoLegible } from '@/features/ventas/cliente/formatoCliente';

const MAX_LINEAS_DESCRIPCION = 2;

export interface LineaVenta {
  articulo: ARTICULOS;
  cantidad: number | null;
}

interface ConfirmarVentaModalProps {
  abierto: boolean;
  productos: LineaVenta[];
  cliente: ClienteDeVenta;
  total: number;
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
                <span className='text-xs font-medium text-gray-500'>{articulo.precio}$</span>
              </div>
              <span className='text-sm text-gray-500 shrink-0'>x{cantidad ?? 0}</span>
              <span className='w-24 text-right text-sm font-semibold text-gray-800 shrink-0'>
                {(articulo.precio * (cantidad ?? 0)).toFixed(2)}$
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
            <p className='text-3xl font-bold text-violet-700 break-words'>{total}$</p>
          </div>
        </div>
      </div>
    </BaseModal>
  );
}
