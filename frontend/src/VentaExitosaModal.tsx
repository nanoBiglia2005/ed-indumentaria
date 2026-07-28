import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import type { RemitoCreado } from '../../backend/types';
import RemitoCard from './RemitoCard';

interface VentaExitosaModalProps {
  remito: RemitoCreado | null;
  onClose: () => void;
}

export default function VentaExitosaModal({ remito, onClose }: VentaExitosaModalProps) {
  return (
    <Transition appear show={remito !== null} as={Fragment}>
      <Dialog as='div' className='relative z-50' onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter='ease-out duration-300'
          enterFrom='opacity-0'
          enterTo='opacity-100'
          leave='ease-in duration-200'
          leaveFrom='opacity-100'
          leaveTo='opacity-0'
        >
          <div className='fixed inset-0 bg-black/25' />
        </Transition.Child>

        <div className='fixed inset-0 overflow-y-auto'>
          <div className='flex min-h-full items-center justify-center p-4 text-center'>
            <Transition.Child
              as={Fragment}
              enter='ease-out duration-300'
              enterFrom='opacity-0 scale-95'
              enterTo='opacity-100 scale-100'
              leave='ease-in duration-200'
              leaveFrom='opacity-100 scale-100'
              leaveTo='opacity-0 scale-95'
            >
              <Dialog.Panel className='w-full max-w-lg transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all'>
                <Dialog.Title as='h3' className='text-lg font-medium leading-6 text-green-600 mb-4 text-center'>
                  ✓ Venta Registrada Exitosamente
                </Dialog.Title>

                {remito?.impresion?.status === 'error' && (
                  <div className='mb-4 p-3 bg-amber-100 border border-amber-400 text-amber-800 rounded flex flex-col'>
                    <span>La venta se guardó, pero no se pudo imprimir el remito.</span>
                    <span className='text-amber-700 text-xs'>{remito.impresion.message}</span>
                  </div>
                )}

                {remito && <RemitoCard remito={remito} abiertoPorDefecto />}

                <button
                  onClick={onClose}
                  className='cursor-pointer w-full mt-6 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-md hover:bg-violet-700 transition-colors'
                >
                  Volver a la Lista
                </button>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
