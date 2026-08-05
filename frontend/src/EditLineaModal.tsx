import { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import type { ARTICULOS, LINEAS } from '../../backend/generated/prisma/client';
import InlineFilterDropdown from './InlineFilterDropdown';

interface EditLineaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  articulo: ARTICULOS | null;
  lineas: LINEAS[];
}

export default function EditLineaModal({
  isOpen,
  onClose,
  onSuccess,
  articulo,
  lineas,
}: EditLineaModalProps) {
  const [lineaSeleccionada, setLineaSeleccionada] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !articulo) return;
    setLineaSeleccionada(articulo.id_linea);
    setError(null);
  }, [isOpen, articulo]);

  const handleGuardar = async () => {
    if (!articulo) return;

    try {
      setIsLoading(true);
      setError(null);

      const respuesta = await fetch(`/api/articulos/${articulo.id_articulo}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_linea: lineaSeleccionada }),
      });

      if (!respuesta.ok) {
        const errorData = await respuesta.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.message || 'No se pudo actualizar la línea del artículo.');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as='div' className='relative z-50' onClose={onClose}>
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
              <Dialog.Panel className='w-full max-w-sm transform rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all'>
                <Dialog.Title as='h3' className='text-lg font-medium leading-6 text-gray-900 mb-4'>
                  Editar Línea
                </Dialog.Title>

                {error && (
                  <div className='mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex flex-col'>
                    <span>Error al editar el articulo</span>
                    <span className='text-red-500 text-xs'>{error}</span>
                  </div>
                )}

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>Línea</label>
                  <InlineFilterDropdown
                    label='Sin línea'
                    opciones={lineas.map((l) => ({ id: l.id_linea, nombre: l.nombre_linea }))}
                    selectedId={lineaSeleccionada}
                    onSelect={setLineaSeleccionada}
                    onClear={() => setLineaSeleccionada(null)}
                  />
                </div>

                <div className='mt-6 flex gap-3'>
                  <button
                    onClick={onClose}
                    className='flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors cursor-pointer'
                  >
                    Cerrar
                  </button>
                  <button
                    onClick={handleGuardar}
                    disabled={isLoading}
                    className='flex-1 px-4 py-2 cursor-pointer text-sm font-medium text-white bg-violet-600 rounded-md hover:bg-violet-700 disabled:bg-violet-400 transition-colors'
                  >
                    {isLoading ? 'Guardando...' : 'Confirmar'}
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
