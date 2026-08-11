import { useEffect, useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import type { RemitoConDetalles } from '../../backend/types';

const SEGUNDOS_DE_ESPERA = 5;

interface AnularRemitoModalProps {
  remito: RemitoConDetalles | null;
  onClose: () => void;
  onAnulado: (remito: RemitoConDetalles) => void;
}

export default function AnularRemitoModal({ remito, onClose, onAnulado }: AnularRemitoModalProps) {
  const [segundos, setSegundos] = useState(SEGUNDOS_DE_ESPERA);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset al llegar un remito distinto, ajustando el estado durante el render
  // en vez de con un efecto (evita el re-render en cascada).
  const [remitoAnterior, setRemitoAnterior] = useState(remito);
  if (remito !== remitoAnterior) {
    setRemitoAnterior(remito);
    setSegundos(SEGUNDOS_DE_ESPERA);
    setError(null);
  }

  // Cuenta regresiva antes de habilitar la anulacion.
  useEffect(() => {
    if (!remito || segundos <= 0) return;
    const timeout = setTimeout(() => setSegundos((actual) => actual - 1), 1000);
    return () => clearTimeout(timeout);
  }, [remito, segundos]);

  const handleAnular = async () => {
    if (!remito || segundos > 0) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/remitos/${remito.id_remito}/anular`, { method: 'PUT' });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.message);
      }

      onAnulado(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo anular el remito.');
    } finally {
      setIsLoading(false);
    }
  };

  const esperando = segundos > 0;

  return (
    <Transition appear show={remito !== null} as={Fragment}>
      <Dialog as='div' className='relative z-[60]' onClose={isLoading ? () => {} : onClose}>
        <Transition.Child
          as={Fragment}
          enter='ease-out duration-100'
          enterFrom='opacity-0'
          enterTo='opacity-100'
          leave='ease-in duration-100'
          leaveFrom='opacity-100'
          leaveTo='opacity-0'
        >
          <div className='fixed inset-0 bg-black/25' />
        </Transition.Child>

        <div className='fixed inset-0 overflow-y-auto'>
          <div className='flex min-h-full items-center justify-center p-4 text-center'>
            <Transition.Child
              as={Fragment}
              enter='ease-out duration-100'
              enterFrom='opacity-0 scale-95'
              enterTo='opacity-100 scale-100'
              leave='ease-in duration-100'
              leaveFrom='opacity-100 scale-100'
              leaveTo='opacity-0 scale-95'
            >
              <Dialog.Panel className='w-full max-w-sm transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all'>
                <Dialog.Title as='h3' className='text-lg font-medium leading-6 text-red-600 mb-4'>
                  Anular Remito
                </Dialog.Title>

                {error && (
                  <div className='mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex flex-col'>
                    <span>Error al anular el remito</span>
                    <span className='text-red-500 text-xs'>{error}</span>
                  </div>
                )}

                <p className='text-sm text-gray-700'>
                  Vas a anular el remito <span className='font-semibold'>#{remito?.id_remito}</span> por{' '}
                  <span className='font-semibold'>{remito?.total_neto ?? 0}$</span>. Esta acción no se
                  puede deshacer.
                </p>

                <div className='mt-6 flex gap-3'>
                  <button
                    onClick={onClose}
                    disabled={isLoading}
                    className='flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-60'
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAnular}
                    disabled={esperando || isLoading}
                    className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${
                      esperando || isLoading
                        ? 'bg-red-300 cursor-not-allowed'
                        : 'bg-red-600 hover:bg-red-700 cursor-pointer'
                    }`}
                  >
                    {isLoading ? 'Anulando...' : esperando ? `Anular (${segundos})` : 'Anular'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
