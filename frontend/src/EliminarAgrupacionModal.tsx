import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import type { TipoAgrupacion } from './CrearAgrupacionModal';

const SEGUNDOS_ESPERA = 5;

const TITULOS: Record<TipoAgrupacion, string> = {
  grupo: 'Eliminar Grupo',
  subgrupo: 'Eliminar Subgrupo',
  colegio: 'Eliminar Colegio/Club',
  linea: 'Eliminar Línea',
};

const NOMBRE_TIPO: Record<TipoAgrupacion, string> = {
  grupo: 'el grupo',
  subgrupo: 'el subgrupo',
  colegio: 'el colegio/club',
  linea: 'la línea',
};

// El grupo cascadea (borra tambien sus subgrupos y las asociaciones de
// articulos), y la linea desasigna (deja sin linea a los articulos que la
// tenian), asi que ameritan una advertencia mas especifica que subgrupo/
// colegio (que directamente fallan si todavia estan en uso).
const ADVERTENCIA: Record<TipoAgrupacion, string> = {
  grupo: 'Esta acción no se puede deshacer. También se eliminarán sus subgrupos y se quitará este grupo de todos los artículos asociados.',
  subgrupo: 'Esta acción no se puede deshacer.',
  colegio: 'Esta acción no se puede deshacer.',
  linea: 'Esta acción no se puede deshacer. Los artículos que tengan esta línea asignada quedarán sin línea.',
};

const ENDPOINTS: Record<TipoAgrupacion, string> = {
  grupo: '/api/grupos',
  subgrupo: '/api/subgrupos',
  colegio: '/api/clientes',
  linea: '/api/lineas',
};

interface EliminarAgrupacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEliminado: () => void;
  tipo: TipoAgrupacion;
  item: { id: number; nombre: string } | null;
}

export default function EliminarAgrupacionModal({
  isOpen,
  onClose,
  onEliminado,
  tipo,
  item,
}: EliminarAgrupacionModalProps) {
  const [segundosRestantes, setSegundosRestantes] = useState(SEGUNDOS_ESPERA);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setSegundosRestantes(SEGUNDOS_ESPERA);
    setError(null);

    const intervalo = setInterval(() => {
      setSegundosRestantes((actual) => (actual <= 1 ? 0 : actual - 1));
    }, 1000);

    return () => clearInterval(intervalo);
  }, [isOpen]);

  const handleClose = () => {
    if (isLoading) return;
    onClose();
  };

  const handleEliminar = async () => {
    if (!item || segundosRestantes > 0) return;

    try {
      setIsLoading(true);
      setError(null);

      const respuesta = await fetch(`${ENDPOINTS[tipo]}/${item.id}`, { method: 'DELETE' });

      if (!respuesta.ok) {
        const errorData = await respuesta.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.details || 'No se pudo eliminar el registro.');
      }

      onEliminado();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  const puedeConfirmar = segundosRestantes <= 0;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as='div' className='relative z-50' onClose={handleClose}>
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
                <Dialog.Title as='h3' className='text-lg font-medium leading-6 text-gray-900 mb-4'>
                  {TITULOS[tipo]}
                </Dialog.Title>

                {error && (
                  <div className='mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex flex-col'>
                    <span className='text-red-500 text-xs'>{error}</span>
                  </div>
                )}

                <p className='text-sm text-gray-700'>
                  ¿Estás seguro que querés eliminar {NOMBRE_TIPO[tipo]}{' '}
                  <span className='font-semibold'>{item?.nombre}</span>? {ADVERTENCIA[tipo]}
                </p>

                <div className='mt-6 flex gap-3'>
                  <button
                    onClick={handleClose}
                    disabled={isLoading}
                    className='flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-60'
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleEliminar}
                    disabled={!puedeConfirmar || isLoading}
                    className='flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed transition-colors cursor-pointer'
                  >
                    {isLoading
                      ? 'Eliminando...'
                      : puedeConfirmar
                      ? 'Confirmar Eliminación'
                      : `Confirmar Eliminación (${segundosRestantes})`}
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
