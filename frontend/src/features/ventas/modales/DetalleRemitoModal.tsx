import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { CaretDownIcon } from '@phosphor-icons/react/dist/csr/CaretDown';
import type { RemitoConDetalles, TIPOS_DE_PAGO } from '@backend/types';
import { ESTADO_FACTURADO } from '@backend/types';
import BaseModal from '@/components/ui/BaseModal';
import PaymentIcon from '@/components/ui/PaymentIcon';
import { formatearFecha, formatearPesos } from '@/utils/formato';
import { estiloDeEstado } from '@/features/ventas/estadosRemito';
import DetalleArticulosRemito from '@/features/ventas/DetalleArticulosRemito';
import { nombreCompleto, telefonoDeCliente } from '@/features/ventas/cliente/formatoCliente';

interface DetalleRemitoModalProps {
  abierto: boolean;
  onCerrar: () => void;
  /** Remito a mostrar; el modal no se muestra sin uno. */
  remito: RemitoConDetalles | null;
  /** Para nombrar cada metodo de pago y los renglones con recargo del detalle. */
  metodos?: TIPOS_DE_PAGO[];
  /** Solo se ofrece sobre ventas FACTURADAS (mismo criterio que RemitoCard). */
  onDevolver?: (remito: RemitoConDetalles) => void;
  onReimprimir?: (remito: RemitoConDetalles) => void;
}

/** Un par etiqueta / valor de la ficha; se apila en mobile y va en grilla en md. */
function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className='flex flex-col min-w-0'>
      <span className='text-xs text-neutro-400'>{etiqueta}</span>
      <span className='font-medium text-black break-words'>{valor}</span>
    </div>
  );
}

/**
 * Ficha completa de una venta ya cerrada (FACTURADA, ANULADA o DEVUELTA).
 *
 * Reemplaza al desplegable inline de RemitoCard para esos estados: una venta
 * cerrada se consulta entera (cliente, como se cobro, que se vendio), mientras
 * que una CONFIRMADA se sigue abriendo inline porque lo unico que se hace con
 * ella es cobrarla o anularla sin salir de la lista.
 */
export default function DetalleRemitoModal({
  abierto,
  onCerrar,
  remito,
  metodos = [],
  onDevolver,
  onReimprimir,
}: DetalleRemitoModalProps) {
  if (!remito) return null;

  const { estilo, palabra } = estiloDeEstado(remito.id_estado);
  const codigo = `${remito.cod_mes}-${remito.cod_remito_final}`;
  const cliente = remito.CLIENTES;
  const pagos = remito.PAGOS_REMITO ?? [];

  const metodosConRecargo = metodos.filter((metodo) => metodo.recargo > 0);
  const nombreDeMetodo = (id_tipo_de_pago: number) =>
    metodos.find((metodo) => metodo.id_tipos_de_pago === id_tipo_de_pago)?.nombre_tipo_de_pago ??
    `Método ${id_tipo_de_pago}`;

  const puedeDevolver = Boolean(onDevolver) && remito.id_estado === ESTADO_FACTURADO;
  const puedeReimprimir = Boolean(onReimprimir) && remito.id_estado === ESTADO_FACTURADO;
  const hayAcciones = puedeDevolver || puedeReimprimir;

  return (
    <BaseModal
      abierto={abierto}
      onCerrar={onCerrar}
      ancho='2xl'
      clasePanel='select-none'
      titulo={
        <span className='flex flex-wrap items-center gap-3'>
          <span className={estilo.texto}>Remito {codigo}</span>
          <span
            className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-xs font-bold text-white ${estilo.fondo}`}
          >
            {palabra}
          </span>
        </span>
      }
      footer={
        hayAcciones ? (
          <>
            {puedeDevolver && (
              <button
                type='button'
                onClick={() => onDevolver?.(remito)}
                className='rounded border border-red-500 px-3 py-1 font-semibold hover:bg-red-600 cursor-pointer transition-colors duration-100 ease-in bg-red-500 text-white'
              >
                Devolver Venta
              </button>
            )}
            {puedeReimprimir && (
              <button
                type='button'
                onClick={() => onReimprimir?.(remito)}
                className='rounded border border-acento-500 px-3 py-1 font-semibold text-acento-600 cursor-pointer transition-colors duration-100 ease-in hover:bg-acento-500 hover:text-white'
              >
                Reimprimir
              </button>
            )}
            <button
              type='button'
              onClick={onCerrar}
              className='ms-auto rounded bg-neutro-100 px-4 py-1 font-medium text-neutro-600 cursor-pointer transition-colors hover:bg-neutro-200'
            >
              Cerrar
            </button>
          </>
        ) : (
          <button
            type='button'
            onClick={onCerrar}
            className='ms-auto rounded bg-neutro-100 px-4 py-1 font-medium text-neutro-600 cursor-pointer transition-colors hover:bg-neutro-200'
          >
            Cerrar
          </button>
        )
      }
    >
      <div className='flex flex-col gap-4'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
          <div className='flex flex-col min-w-0'>
            <span className='text-xs text-neutro-400'>Total</span>
            <span className='text-xl font-bold text-black'>
              {formatearPesos(remito.total_final ?? remito.total_efectivo)}
            </span>
          </div>
          <Dato etiqueta='Fecha de Emisión' valor={formatearFecha(remito.fecha_de_emision)} />
          <Dato etiqueta='Fecha de Creación' valor={formatearFecha(remito.fecha_de_creacion)} />
        </div>

        {/* Cliente: el nombre siempre a la vista; el resto detras del
            desplegable, porque en el 90% de las consultas alcanza con saber de
            quien fue la venta. */}
        <div className='rounded border border-neutro-200'>
          <span className='block px-3 pt-2 text-xs text-neutro-400'>Cliente</span>
          {!cliente ? (
            <p className='px-3 pb-2 font-medium text-neutro-400'>No Asignado</p>
          ) : (
            <Disclosure>
              {({ open }) => (
                <>
                  <DisclosureButton className='w-full flex items-center justify-between gap-3 px-3 pb-2 text-left cursor-pointer hover:bg-neutro-100 transition-colors duration-100 ease-in'>
                    <span className='font-medium text-black truncate'>
                      {nombreCompleto(cliente)}
                    </span>
                    <CaretDownIcon
                      size={16}
                      className={`shrink-0 text-neutro-400 transition-transform duration-200 ${
                        open ? 'rotate-180' : ''
                      }`}
                    />
                  </DisclosureButton>
                  <DisclosurePanel className='grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-neutro-200 px-3 py-2 text-sm'>
                    <Dato etiqueta='DNI' valor={cliente.dni ?? 'Sin dato'} />
                    <Dato etiqueta='Teléfono' valor={telefonoDeCliente(cliente) || 'Sin dato'} />
                    <Dato etiqueta='Email' valor={cliente.email ?? 'Sin dato'} />
                    <Dato
                      etiqueta='Fecha de nacimiento'
                      valor={
                        cliente.fecha_nacimiento
                          ? formatearFecha(cliente.fecha_nacimiento)
                          : 'Sin dato'
                      }
                    />
                  </DisclosurePanel>
                </>
              )}
            </Disclosure>
          )}
        </div>

        {/* Los pagos recien se cargan al cobrar: una venta anulada puede no
            tener ninguno. */}
        <div className='flex flex-col gap-1'>
          <span className='text-xs text-neutro-400'>Métodos de pago</span>
          {pagos.length === 0 ? (
            <p className='text-sm text-neutro-400 italic'>Sin registrar</p>
          ) : (
            <ul className='flex flex-col divide-y divide-black/5'>
              {pagos.map((pago) => (
                <li
                  key={pago.id_pago}
                  className='flex items-center justify-between gap-3 py-1.5 text-sm'
                >
                  <span className='flex items-center gap-2 min-w-0 text-neutro-600'>
                    <PaymentIcon paymentId={pago.id_tipo_de_pago} height={18} />
                    <span className='truncate'>{nombreDeMetodo(pago.id_tipo_de_pago)}</span>
                  </span>
                  <span className='font-semibold text-black whitespace-nowrap'>
                    {formatearPesos(pago.monto_final)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className='flex flex-col gap-1 min-w-0'>
          <span className='text-xs text-neutro-400'>Artículos</span>
          {/* El tope de alto va sobre la lista y no sobre el panel: arriba hay
              codigo, cliente y pagos compitiendo por el alto de pantalla. */}
          <DetalleArticulosRemito
            detalles={remito.DETALLES_REMITO}
            metodosConRecargo={metodosConRecargo}
            compacto
            claseContenedor='max-h-56 md:max-h-64 overflow-y-auto overflow-x-auto rounded border border-neutro-200 px-3 py-2'
          />
        </div>
      </div>
    </BaseModal>
  );
}
