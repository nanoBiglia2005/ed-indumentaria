import type { TIPOS_DE_PAGO } from '@backend/types';
import BaseModal from '@/components/ui/BaseModal';
import PaymentIcon from '@/components/ui/PaymentIcon';
import { formatearPesos } from '@/features/ventas/pago/calculoPago';

/**
 * Un metodo con plata asignada. `inicial` es cuanto del precio de la venta
 * cubre y `final` cuanto se cobra por caja: coinciden solo si el metodo no
 * tiene recargo.
 */
export interface PagoAConfirmar {
  tipo: TIPOS_DE_PAGO;
  inicial: number;
  final: number;
}

interface ConfirmarPagoModalProps {
  abierto: boolean;
  /** Solo los metodos con monto asignado; los que quedaron en 0 no se cobran. */
  pagos: PagoAConfirmar[];
  totalEfectivo: number;
  totalFinal: number;
  /** Codigo visible del remito que se esta cobrando. */
  codigo: string;
  /** Se esta facturando (el boton de confirmar queda en curso). */
  cargando: boolean;
  onCerrar: () => void;
  onConfirmar: () => void;
}

/**
 * Ultimo paso antes de facturar: se repasa cuanto se cobra y con que metodos.
 * Los importes son los mismos que ya muestra MetodoPagoModal (salen del mismo
 * calculo), asi que confirmar no puede cobrar algo distinto de lo que se vio.
 */
export default function ConfirmarPagoModal({
  abierto,
  pagos,
  totalEfectivo,
  totalFinal,
  codigo,
  cargando,
  onCerrar,
  onConfirmar,
}: ConfirmarPagoModalProps) {
  return (
    <BaseModal
      abierto={abierto}
      onCerrar={cargando ? () => {} : onCerrar}
      titulo={
        <div className='flex items-center justify-between gap-4'>
          <span>¿Desea finalizar este Pago?</span>
          <span className='text-2xl font-bold text-violet-600'>{codigo}</span>
        </div>
      }
      claseTitulo='text-2xl font-semibold leading-7 text-gray-900 mb-5'
      ancho='lg'
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
            Volver
          </button>
          <button
            type='button'
            onClick={onConfirmar}
            disabled={cargando}
            className='flex-1 px-4 py-2 text-sm font-medium text-white bg-violet-800 rounded-md hover:bg-violet-900 disabled:bg-violet-400 disabled:cursor-not-allowed transition-colors cursor-pointer'
          >
            {cargando ? 'Finalizando...' : 'Confirmar'}
          </button>
        </div>
      }
    >
      <div className='flex flex-col gap-4'>
        <div className='flex flex-col gap-2'>
          <p className='mb-2 text-sm font-medium text-gray-400'>
            {pagos.length === 1 ? 'Se cobra con' : 'Se cobra repartido entre'}
          </p>

          <div className='rounded-md border border-gray-200 divide-y divide-gray-100'>
            {pagos.map(({ tipo, final }) => (
              <div
                key={tipo.id_tipos_de_pago}
                className='flex items-center justify-between gap-3 px-3 py-2.5'
              >
                <span
                  className='flex min-w-0 items-center gap-2 text-sm font-semibold text-gray-800'
                  title={`Pago con ${tipo.nombre_tipo_de_pago}`}
                >
                  <PaymentIcon paymentId={tipo.id_tipos_de_pago} height={20} />
                  <span className='truncate'>{tipo.nombre_tipo_de_pago}</span>
                  {tipo.recargo > 0 && (
                    <span className='shrink-0 text-xs font-medium text-violet-500'>
                      ({tipo.recargo}% de Recargo)
                    </span>
                  )}
                </span>

                <span className='flex shrink-0 flex-col items-end'>
                  <span
                    className={`text-lg font-bold ${
                      tipo.recargo > 0 ? 'text-violet-600' : 'text-gray-900'
                    }`}
                  >
                    {formatearPesos(final)}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Mismo bloque de totales que MetodoPagoModal, para que los numeros se
            lean igual en los dos pasos. */}
        <div className='flex items-end justify-between gap-4 border-t border-gray-200 pt-3'>
          <div className='flex flex-col'>
            <span className='text-sm font-medium text-gray-400'>Total en Efectivo</span>
            <span className='text-2xl font-bold text-gray-900'>{formatearPesos(totalEfectivo)}</span>
          </div>
          <div className='flex flex-col items-end'>
            <span className='text-sm font-medium text-violet-400'>Total Final</span>
            <span className='text-3xl font-bold text-violet-600'>{formatearPesos(totalFinal)}</span>
          </div>
        </div>
      </div>
    </BaseModal>
  );
}
