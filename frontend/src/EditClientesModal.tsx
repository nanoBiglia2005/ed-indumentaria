import { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import type { ARTICULOS, CLIENTES, ARTICULOS_X_GRUPO_VENTA } from '../../backend/generated/prisma/client';
import InlineFilterDropdown from './InlineFilterDropdown';

interface EditClientesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  articulo: ARTICULOS | null;
  clientes: CLIENTES[];
  articulosXGrupo: ARTICULOS_X_GRUPO_VENTA[];
}

export default function EditClientesModal({
  isOpen,
  onClose,
  onSuccess,
  articulo,
  clientes,
  articulosXGrupo,
}: EditClientesModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [clientesOriginales, setClientesOriginales] = useState<CLIENTES[]>([]);
  const [clientesSeleccionados, setClientesSeleccionados] = useState<CLIENTES[]>([]);

  useEffect(() => {
    if (!isOpen || !articulo) return;

    setError(null);

    const clientesDelArticulo = clientes.filter((cliente) =>
      articulosXGrupo.some(
        (rel) => rel.id_articulo === articulo.id_articulo && rel.id_cliente === cliente.id_cliente
      )
    );

    setClientesOriginales(clientesDelArticulo);
    setClientesSeleccionados(clientesDelArticulo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, articulo]);

  const handleGuardar = async () => {
    if (!articulo) return;

    try {
      setIsLoading(true);
      setError(null);

      const clientesOriginalesIds = new Set(clientesOriginales.map((c) => c.id_cliente));
      const clientesSeleccionadosIds = new Set(clientesSeleccionados.map((c) => c.id_cliente));
      const clientesAAgregar = clientesSeleccionados.filter((c) => !clientesOriginalesIds.has(c.id_cliente));
      const clientesAQuitar = clientesOriginales.filter((c) => !clientesSeleccionadosIds.has(c.id_cliente));

      // Primero se quitan y despues se agregan: si el articulo no esta en
      // ningun grupo, agregar un cliente crea una fila via su grupo exclusivo.
      const resultados: Response[] = [];
      for (const cliente of clientesAQuitar) {
        resultados.push(
          await fetch(`/api/articulos/${articulo.id_articulo}/clientes/${cliente.id_cliente}`, {
            method: 'DELETE',
          })
        );
      }
      for (const cliente of clientesAAgregar) {
        resultados.push(
          await fetch(`/api/articulos/${articulo.id_articulo}/clientes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_cliente: cliente.id_cliente }),
          })
        );
      }

      if (resultados.some((r) => !r.ok)) {
        throw new Error('Hubo un error al actualizar los colegios/clubes asociados.');
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
              <Dialog.Panel className='w-full max-w-md transform rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all'>
                <Dialog.Title as='h3' className='text-lg font-medium leading-6 text-gray-900 mb-4'>
                  Editar Colegios/Clubes
                </Dialog.Title>

                {error && (
                  <div className='mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex flex-col'>
                    <span>Error al editar el articulo</span>
                    <span className='text-red-500 text-xs'>{error}</span>
                  </div>
                )}

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>Colegios/Clubes</label>
                  <div className='mb-3'>
                    <InlineFilterDropdown
                      label='Agregar Colegio/Club'
                      opciones={clientes
                        .filter((c) => !clientesSeleccionados.some((sel) => sel.id_cliente === c.id_cliente))
                        .map((c) => ({ id: c.id_cliente, nombre: c.nombre }))}
                      selectedId={null}
                      onSelect={(id) => {
                        const cliente = clientes.find((c) => c.id_cliente === id);
                        if (cliente) {
                          setClientesSeleccionados((prev) => [...prev, cliente]);
                        }
                      }}
                      onClear={() => {}}
                    />
                  </div>

                  {clientesSeleccionados.length === 0 ? (
                    <p className='text-sm text-gray-400 italic'>No asignado a ningún cliente</p>
                  ) : (
                    <ul className='flex flex-wrap gap-2'>
                      {clientesSeleccionados.map((cliente) => (
                        <li
                          key={cliente.id_cliente}
                          className='flex items-center justify-between gap-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700'
                        >
                          <span>{cliente.nombre}</span>
                          <button
                            type='button'
                            onClick={() =>
                              setClientesSeleccionados((prev) =>
                                prev.filter((c) => c.id_cliente !== cliente.id_cliente)
                              )
                            }
                            className='font-bold text-gray-400 hover:text-red-600 cursor-pointer px-1'
                          >
                            X
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
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
