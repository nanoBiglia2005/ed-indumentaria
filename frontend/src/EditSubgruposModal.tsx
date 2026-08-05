import { useState, useEffect, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import type {
  ARTICULOS,
  GRUPOS_DE_VENTA,
  SUBGRUPOS_DE_VENTA,
  ARTICULOS_X_GRUPO_VENTA,
} from '../../backend/generated/prisma/client';
import InlineFilterDropdown from './InlineFilterDropdown';

interface EditSubgruposModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  articulo: ARTICULOS | null;
  grupos: GRUPOS_DE_VENTA[];
  subgrupos: SUBGRUPOS_DE_VENTA[];
  articulosXGrupo: ARTICULOS_X_GRUPO_VENTA[];
}

export default function EditSubgruposModal({
  isOpen,
  onClose,
  onSuccess,
  articulo,
  grupos,
  subgrupos,
  articulosXGrupo,
}: EditSubgruposModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // El articulo solo puede tener un subgrupo por cada grupo al que
  // pertenece: un dropdown de reemplazo por grupo, no una lista libre.
  const gruposDelArticulo = useMemo(() => {
    if (!articulo) return [];
    const idsDeGrupo = new Set(
      articulosXGrupo
        .filter((rel) => rel.id_articulo === articulo.id_articulo)
        .map((rel) => rel.id_grupo_venta)
    );
    return grupos
      .filter((grupo) => idsDeGrupo.has(grupo.id_grupo))
      .sort((a, b) => (a.nombre_grupo ?? '').localeCompare(b.nombre_grupo ?? ''));
  }, [articulo, grupos, articulosXGrupo]);

  const [subgrupoOriginalPorGrupo, setSubgrupoOriginalPorGrupo] = useState<Record<number, number | null>>({});
  const [subgrupoPorGrupo, setSubgrupoPorGrupo] = useState<Record<number, number | null>>({});

  useEffect(() => {
    if (!isOpen || !articulo) return;

    setError(null);

    // Si por alguna razon hay mas de una fila para el mismo grupo, se
    // prioriza la que tenga un subgrupo asignado por sobre una vacia (evita
    // que una fila duplicada en null tape el subgrupo real al reabrir).
    const actual: Record<number, number | null> = {};
    for (const rel of articulosXGrupo) {
      if (rel.id_articulo !== articulo.id_articulo) continue;
      const previo = actual[rel.id_grupo_venta];
      if (previo === undefined || (previo === null && rel.id_subgrupo !== null)) {
        actual[rel.id_grupo_venta] = rel.id_subgrupo;
      }
    }

    setSubgrupoOriginalPorGrupo(actual);
    setSubgrupoPorGrupo(actual);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, articulo]);

  const handleGuardar = async () => {
    if (!articulo) return;

    try {
      setIsLoading(true);
      setError(null);

      const resultados: Response[] = [];
      for (const grupo of gruposDelArticulo) {
        const original = subgrupoOriginalPorGrupo[grupo.id_grupo] ?? null;
        const nuevo = subgrupoPorGrupo[grupo.id_grupo] ?? null;
        if (nuevo === original) continue;

        if (nuevo !== null) {
          resultados.push(
            await fetch(`/api/articulos/${articulo.id_articulo}/subgrupos`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id_subgrupo: nuevo }),
            })
          );
        } else if (original !== null) {
          resultados.push(
            await fetch(`/api/articulos/${articulo.id_articulo}/subgrupos/${original}`, {
              method: 'DELETE',
            })
          );
        }
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
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Subgrupo por grupo (uno por grupo)
                  </label>

                  {gruposDelArticulo.length === 0 ? (
                    <p className='text-sm text-gray-400 italic'>Asigná el artículo a un grupo primero</p>
                  ) : (
                    <ul className='flex flex-col gap-2'>
                      {gruposDelArticulo.map((grupo) => {
                        const opcionesDelGrupo = subgrupos
                          .filter((s) => s.id_grupo === grupo.id_grupo)
                          .map((s) => ({ id: s.id_subgrupo, nombre: s.nombre_subgrupo }));

                        return (
                          <li key={grupo.id_grupo} className='flex items-center justify-between gap-3'>
                            <span className='text-sm text-gray-700 truncate'>
                              {grupo.nombre_grupo ?? `Grupo ${grupo.id_grupo}`}
                            </span>
                            <InlineFilterDropdown
                              label={opcionesDelGrupo.length === 0 ? 'Sin subgrupos' : 'Sin subgrupo'}
                              opciones={opcionesDelGrupo}
                              selectedId={subgrupoPorGrupo[grupo.id_grupo] ?? null}
                              onSelect={(id) =>
                                setSubgrupoPorGrupo((prev) => ({ ...prev, [grupo.id_grupo]: id }))
                              }
                              onClear={() =>
                                setSubgrupoPorGrupo((prev) => ({ ...prev, [grupo.id_grupo]: null }))
                              }
                              disabled={opcionesDelGrupo.length === 0}
                            />
                          </li>
                        );
                      })}
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
