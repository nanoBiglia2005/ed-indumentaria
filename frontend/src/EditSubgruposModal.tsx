import { useState, useEffect, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import type { ARTICULOS, SUBGRUPOS_DE_VENTA, ARTICULOS_X_GRUPO_VENTA } from '../../backend/generated/prisma/client';
import InlineFilterDropdown from './InlineFilterDropdown';

interface EditSubgruposModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  articulo: ARTICULOS | null;
  subgrupos: SUBGRUPOS_DE_VENTA[];
  articulosXGrupo: ARTICULOS_X_GRUPO_VENTA[];
}

export default function EditSubgruposModal({
  isOpen,
  onClose,
  onSuccess,
  articulo,
  subgrupos,
  articulosXGrupo,
}: EditSubgruposModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [subgruposOriginales, setSubgruposOriginales] = useState<SUBGRUPOS_DE_VENTA[]>([]);
  const [subgruposSeleccionados, setSubgruposSeleccionados] = useState<SUBGRUPOS_DE_VENTA[]>([]);

  // Solo se puede agregar un subgrupo de un grupo al que el articulo ya
  // pertenezca (no cualquier subgrupo de la base).
  const idsGruposDelArticulo = useMemo(() => {
    if (!articulo) return new Set<number>();
    return new Set(
      articulosXGrupo
        .filter((rel) => rel.id_articulo === articulo.id_articulo)
        .map((rel) => rel.id_grupo_venta)
    );
  }, [articulo, articulosXGrupo]);

  useEffect(() => {
    if (!isOpen || !articulo) return;

    setError(null);

    const subgruposDelArticulo = subgrupos.filter((subgrupo) =>
      articulosXGrupo.some(
        (rel) => rel.id_articulo === articulo.id_articulo && rel.id_subgrupo === subgrupo.id_subgrupo
      )
    );

    setSubgruposOriginales(subgruposDelArticulo);
    setSubgruposSeleccionados(subgruposDelArticulo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, articulo]);

  const handleGuardar = async () => {
    if (!articulo) return;

    try {
      setIsLoading(true);
      setError(null);

      const subgruposOriginalesIds = new Set(subgruposOriginales.map((s) => s.id_subgrupo));
      const subgruposSeleccionadosIds = new Set(subgruposSeleccionados.map((s) => s.id_subgrupo));
      const subgruposAAgregar = subgruposSeleccionados.filter((s) => !subgruposOriginalesIds.has(s.id_subgrupo));
      const subgruposAQuitar = subgruposOriginales.filter((s) => !subgruposSeleccionadosIds.has(s.id_subgrupo));

      // Primero se quitan y despues se agregan: si el articulo no esta en el
      // grupo del subgrupo, agregarlo crea una fila via ese grupo.
      const resultados: Response[] = [];
      for (const subgrupo of subgruposAQuitar) {
        resultados.push(
          await fetch(`/api/articulos/${articulo.id_articulo}/subgrupos/${subgrupo.id_subgrupo}`, {
            method: 'DELETE',
          })
        );
      }
      for (const subgrupo of subgruposAAgregar) {
        resultados.push(
          await fetch(`/api/articulos/${articulo.id_articulo}/subgrupos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_subgrupo: subgrupo.id_subgrupo }),
          })
        );
      }

      if (resultados.some((r) => !r.ok)) {
        throw new Error('Hubo un error al actualizar los subgrupos asociados.');
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
                  Editar Subgrupos
                </Dialog.Title>

                {error && (
                  <div className='mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex flex-col'>
                    <span>Error al editar el articulo</span>
                    <span className='text-red-500 text-xs'>{error}</span>
                  </div>
                )}

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>Subgrupos</label>
                  <div className='mb-3'>
                    <InlineFilterDropdown
                      label={idsGruposDelArticulo.size === 0 ? 'Asigná un grupo primero' : 'Agregar Subgrupo'}
                      opciones={subgrupos
                        .filter(
                          (s) =>
                            idsGruposDelArticulo.has(s.id_grupo) &&
                            !subgruposSeleccionados.some((sel) => sel.id_subgrupo === s.id_subgrupo)
                        )
                        .map((s) => ({ id: s.id_subgrupo, nombre: s.nombre_subgrupo }))}
                      selectedId={null}
                      onSelect={(id) => {
                        const subgrupo = subgrupos.find((s) => s.id_subgrupo === id);
                        if (subgrupo) {
                          setSubgruposSeleccionados((prev) => [...prev, subgrupo]);
                        }
                      }}
                      onClear={() => {}}
                      disabled={idsGruposDelArticulo.size === 0}
                    />
                  </div>

                  {subgruposSeleccionados.length === 0 ? (
                    <p className='text-sm text-gray-400 italic'>No asignado a ningún subgrupo</p>
                  ) : (
                    <ul className='flex flex-wrap gap-2'>
                      {subgruposSeleccionados.map((subgrupo) => (
                        <li
                          key={subgrupo.id_subgrupo}
                          className='flex items-center justify-between gap-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700'
                        >
                          <span>{subgrupo.nombre_subgrupo}</span>
                          <button
                            type='button'
                            onClick={() =>
                              setSubgruposSeleccionados((prev) =>
                                prev.filter((s) => s.id_subgrupo !== subgrupo.id_subgrupo)
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
