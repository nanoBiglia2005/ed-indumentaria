import { Fragment, useEffect, useMemo, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { resaltarCoincidencia } from './textUtils';

export type OpcionSeleccionable = { id: number; nombre: string };

interface SelectListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  opciones: OpcionSeleccionable[];
  onSelect: (opcion: OpcionSeleccionable) => void;
  emptyMessage?: string;
  /** Si se pasa, muestra un boton "Crear" entre el buscador y la lista. */
  onCrear?: () => void;
  crearLabel?: string;
}

export default function SelectListModal({
  isOpen,
  onClose,
  title,
  opciones,
  onSelect,
  emptyMessage = 'No hay más opciones disponibles',
  onCrear,
  crearLabel = 'Crear',
}: SelectListModalProps) {
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    if (isOpen) setBusqueda('');
  }, [isOpen]);

  const opcionesFiltradas = useMemo(() => {
    if (busqueda === '') return opciones;
    const termino = busqueda.toLowerCase();
    return opciones.filter((opcion) => opcion.nombre.toLowerCase().includes(termino));
  }, [opciones, busqueda]);

  const mostrarBuscador = opciones.length > 0 || Boolean(onCrear);

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

                {mostrarBuscador && (
                  <div className='relative mb-3 flex items-center'>
                    <svg
                      className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400'
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        d='M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.35 4.35a7.5 7.5 0 0012.3 12.3z'
                      />
                    </svg>
                    <input
                      type='text'
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      placeholder='Buscar...'
                      className='w-full rounded border border-gray-300 bg-white py-1.5 pl-9 pr-8 text-sm text-gray-700 placeholder:text-gray-400 transition-colors duration-100 ease-in hover:border-violet-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30'
                    />
                    {busqueda && (
                      <button
                        type='button'
                        onClick={() => setBusqueda('')}
                        className='absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer font-bold text-gray-400 hover:text-violet-600'
                      >
                        ×
                      </button>
                    )}
                  </div>
                )}

                {onCrear && (
                  <button
                    type='button'
                    onClick={onCrear}
                    className='w-full mb-3 flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-violet-600 border border-violet-600 rounded-md hover:bg-violet-50 transition-colors cursor-pointer'
                  >
                    + {crearLabel}
                  </button>
                )}

                {opciones.length === 0 ? (
                  <p className='text-sm text-gray-400 italic'>{emptyMessage}</p>
                ) : opcionesFiltradas.length === 0 ? (
                  <p className='text-sm text-gray-400 italic'>Sin resultados</p>
                ) : (
                  <ul className='max-h-60 overflow-y-auto min-h-[600px] overflow-x-hidden divide-y divide-gray-100 border border-gray-200 rounded-md'>
                    {opcionesFiltradas.map((opcion) => (
                      <li
                        key={opcion.id}
                        onClick={() => onSelect(opcion)}
                        className='px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-100'
                      >
                        {busqueda ? resaltarCoincidencia(opcion.nombre, busqueda) : opcion.nombre}
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
