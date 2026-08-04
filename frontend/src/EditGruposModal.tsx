import { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import type { ARTICULOS, GRUPOS_DE_VENTA, ARTICULOS_X_GRUPO_VENTA } from '../../backend/generated/prisma/client';
import InlineFilterDropdown from './InlineFilterDropdown';

interface EditGruposModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  articulo: ARTICULOS | null;
  grupos: GRUPOS_DE_VENTA[];
  articulosXGrupo: ARTICULOS_X_GRUPO_VENTA[];
}

export default function EditGruposModal({
  isOpen,
  onClose,
  onSuccess,
  articulo,
  grupos,
  articulosXGrupo,
}: EditGruposModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [gruposOriginales, setGruposOriginales] = useState<GRUPOS_DE_VENTA[]>([]);
  const [gruposSeleccionados, setGruposSeleccionados] = useState<GRUPOS_DE_VENTA[]>([]);

  useEffect(() => {
    if (!isOpen || !articulo) return;

    setError(null);

    const gruposDelArticulo = grupos.filter((grupo) =>
      articulosXGrupo.some(
        (rel) => rel.id_articulo === articulo.id_articulo && rel.id_grupo_venta === grupo.id_grupo
      )
    );

    setGruposOriginales(gruposDelArticulo);
    setGruposSeleccionados(gruposDelArticulo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, articulo]);

  const handleGuardar = async () => {
    if (!articulo) return;

    try {
      setIsLoading(true);
      setError(null);

      const gruposOriginalesIds = new Set(gruposOriginales.map((g) => g.id_grupo));
      const gruposSeleccionadosIds = new Set(gruposSeleccionados.map((g) => g.id_grupo));
      const gruposAAgregar = gruposSeleccionados.filter((g) => !gruposOriginalesIds.has(g.id_grupo));
      const gruposAQuitar = gruposOriginales.filter((g) => !gruposSeleccionadosIds.has(g.id_grupo));

      const resultados = await Promise.all([
        ...gruposAAgregar.map((grupo) =>
          fetch(`/api/articulos/${articulo.id_articulo}/grupos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_grupo: grupo.id_grupo }),
          })
        ),
        ...gruposAQuitar.map((grupo) =>
          fetch(`/api/articulos/${articulo.id_articulo}/grupos/${grupo.id_grupo}`, {
            method: 'DELETE',
          })
        ),
      ]);

      if (resultados.some((r) => !r.ok)) {
        throw new Error('Hubo un error al actualizar los grupos asociados.');
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
                  Editar Grupos
                </Dialog.Title>

                {error && (
                  <div className='mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex flex-col'>
                    <span>Error al editar el articulo</span>
                    <span className='text-red-500 text-xs'>{error}</span>
                  </div>
                )}

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>Grupos de Articulos</label>
                  <div className='mb-3'>
                    <InlineFilterDropdown
                      label='Agregar Grupo'
                      opciones={grupos
                        .filter((g) => !gruposSeleccionados.some((sel) => sel.id_grupo === g.id_grupo))
                        .map((g) => ({ id: g.id_grupo, nombre: g.nombre_grupo ?? `Grupo ${g.id_grupo}` }))}
                      selectedId={null}
                      onSelect={(id) => {
                        const grupo = grupos.find((g) => g.id_grupo === id);
                        if (grupo) {
                          setGruposSeleccionados((prev) => [...prev, grupo]);
                        }
                      }}
                      onClear={() => {}}
                    />
                  </div>

                  {gruposSeleccionados.length === 0 ? (
                    <p className='text-sm text-gray-400 italic'>No asignado a ningún grupo</p>
                  ) : (
                    <ul className='flex flex-wrap gap-2'>
                      {gruposSeleccionados.map((grupo) => (
                        <li
                          key={grupo.id_grupo}
                          className='flex items-center gap-1 justify-between px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700 w-fit'
                        >
                          <span>{grupo.nombre_grupo ?? `Grupo ${grupo.id_grupo}`}</span>
                          <button
                            type='button'
                            onClick={() =>
                              setGruposSeleccionados((prev) =>
                                prev.filter((g) => g.id_grupo !== grupo.id_grupo)
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
