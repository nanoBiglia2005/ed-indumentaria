import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';

export type OpcionSeleccionable = { id: number; nombre: string };

interface SelectListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  opciones: OpcionSeleccionable[];
  onSelect: (opcion: OpcionSeleccionable) => void;
  emptyMessage?: string;
}

export default function SelectListModal({
  isOpen,
  onClose,
  title,
  opciones,
  onSelect,
  emptyMessage = 'No hay más opciones disponibles',
}: SelectListModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as='div' className='relative z-[60]' onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter='ease-out duration-100'
          enterFrom='opacity-0'
          enterTo='opacity-100'
          leave='ease-in duration-100'
          leaveFrom='opacity-100'
          leaveTo='opacity-0'
        >
          <div className='fixed inset-0 bg-black/25'/>
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
                <Dialog.Title as='h3' className='text-lg font-medium leading-6 text-gray-900 mb-4'>
                  {title}
                </Dialog.Title>

                {opciones.length === 0 ? (
                  <p className='text-sm text-gray-400 italic'>{emptyMessage}</p>
                ) : (
                  <ul className='max-h-60 overflow-y-auto min-h-[600px] overflow-x-hidden divide-y divide-gray-100 border border-gray-200 rounded-md'>
                    {opciones.map((opcion) => (
                      <li
                        key={opcion.id}
                        onClick={() => onSelect(opcion)}
                        className='px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-100'
                      >
                        {opcion.nombre}
                      </li>
                    ))}
                  </ul>
                )}

                <div className='mt-6'>
                  <button
                    onClick={onClose}
                    className='w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors cursor-pointer'
                  >
                    Cerrar
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
