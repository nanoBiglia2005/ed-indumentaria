import { Fragment } from 'react';
import type { ReactNode } from 'react';
import { Dialog, Transition } from '@headlessui/react';

const ANCHOS = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '5xl': 'max-w-5xl',
} as const;

/** Banner rojo estandar de los modales: titulo (opcional) + detalle chico. */
export function ErrorBanner({ titulo, detalle }: { titulo?: string; detalle: ReactNode }) {
  return (
    <div className='mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex flex-col'>
      {titulo && <span>{titulo}</span>}
      <span className='text-red-500 text-xs'>{detalle}</span>
    </div>
  );
}

export type ErrorModal = { titulo?: string; detalle: ReactNode } | null;

interface BaseModalProps {
  abierto: boolean;
  onCerrar: () => void;
  titulo: ReactNode;
  children: ReactNode;
  /** Botonera; se envuelve en el contenedor estandar `mt-6 flex gap-3`. */
  footer?: ReactNode;
  /** Banner de error estandar debajo del titulo (null = sin banner). */
  error?: ErrorModal;
  ancho?: keyof typeof ANCHOS;
  /** z-index del Dialog: los modales apilados usan z-[60] / z-[70]. */
  z?: string;
  /** Clase del titulo; los modales destructivos usan text-red-600. */
  colorTitulo?: string;
  /** Override completo de la clase del titulo (tamano/alineacion distintos). */
  claseTitulo?: string;
  /** Clases extra para el panel (p. ej. 'select-none'). */
  clasePanel?: string;
  /** true cuando el cuerpo tiene dropdowns que deben desbordar el panel. */
  permitirDesborde?: boolean;
  /** Transicion lenta (300/200ms) usada por los modales de exito. */
  transicionLenta?: boolean;
  /** Contenido ANTES del titulo (p. ej. un toast absoluto sobre el panel). */
  encabezado?: ReactNode;
  /** Contenido entre el titulo y el banner de error (p. ej. migas de pan). */
  debajoDelTitulo?: ReactNode;
}

/**
 * Esqueleto comun de todos los modales: overlay, centrado, panel, titulo,
 * banner de error y footer. El cuerpo (children) es libre: formularios,
 * listas, tablas — eso queda en cada modal.
 *
 * Convencion de apertura: `abierto: boolean` + el payload como prop separada
 * del modal concreto (no payload-anulable).
 */
export default function BaseModal({
  abierto,
  onCerrar,
  titulo,
  children,
  footer,
  error,
  ancho = 'sm',
  z = 'z-50',
  colorTitulo = 'text-gray-900',
  claseTitulo,
  clasePanel = '',
  permitirDesborde = false,
  transicionLenta = false,
  encabezado = null,
  debajoDelTitulo = null,
}: BaseModalProps) {
  const entrada = transicionLenta ? 'ease-out duration-300' : 'ease-out duration-100';
  const salida = transicionLenta ? 'ease-in duration-200' : 'ease-in duration-100';

  return (
    <Transition appear show={abierto} as={Fragment}>
      <Dialog as='div' className={`relative ${z}`} onClose={onCerrar}>
        <Transition.Child
          as={Fragment}
          enter={entrada}
          enterFrom='opacity-0'
          enterTo='opacity-100'
          leave={salida}
          leaveFrom='opacity-100'
          leaveTo='opacity-0'
        >
          <div className='fixed inset-0 bg-black/25' />
        </Transition.Child>

        <div className='fixed inset-0 overflow-y-auto'>
          <div className='flex min-h-full items-center justify-center p-4 text-center'>
            <Transition.Child
              as={Fragment}
              enter={entrada}
              enterFrom='opacity-0 scale-95'
              enterTo='opacity-100 scale-100'
              leave={salida}
              leaveFrom='opacity-100 scale-100'
              leaveTo='opacity-0 scale-95'
            >
              <Dialog.Panel
                className={`w-full ${ANCHOS[ancho]} transform ${
                  permitirDesborde ? '' : 'overflow-hidden '
                }rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all${
                  clasePanel ? ` ${clasePanel}` : ''
                }`}
              >
                {encabezado}

                <Dialog.Title
                  as='h3'
                  className={claseTitulo ?? `text-lg font-medium leading-6 ${colorTitulo} mb-4`}
                >
                  {titulo}
                </Dialog.Title>

                {debajoDelTitulo}

                {error && <ErrorBanner titulo={error.titulo} detalle={error.detalle} />}

                {children}

                {footer && <div className='mt-6 flex gap-3'>{footer}</div>}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
