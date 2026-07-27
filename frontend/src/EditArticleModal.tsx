import { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import type {
  GRUPOS_DE_VENTA,
  CLIENTES,
  ARTICULOS_X_GRUPO_VENTA_alt,
  ARTICULOS_X_CLIENTES,
} from '../../backend/generated/prisma/client';
import type { ArticuloConRelaciones } from '../../backend/types';
import SelectListModal from './SelectListModal';

interface EditArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  articulo: ArticuloConRelaciones | null;
  grupos: GRUPOS_DE_VENTA[];
  clientes: CLIENTES[];
  articulosXGrupo: ARTICULOS_X_GRUPO_VENTA_alt[];
  articulosXClientes: ARTICULOS_X_CLIENTES[];
}

export default function EditArticleModal({
  isOpen,
  onClose,
  onSuccess,
  articulo,
  grupos,
  clientes,
  articulosXGrupo,
  articulosXClientes,
}: EditArticleModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [gruposOriginales, setGruposOriginales] = useState<GRUPOS_DE_VENTA[]>([]);
  const [gruposSeleccionados, setGruposSeleccionados] = useState<GRUPOS_DE_VENTA[]>([]);
  const [clientesOriginales, setClientesOriginales] = useState<CLIENTES[]>([]);
  const [clientesSeleccionados, setClientesSeleccionados] = useState<CLIENTES[]>([]);

  const [isGrupoAssignOpen, setIsGrupoAssignOpen] = useState(false);
  const [isClienteAssignOpen, setIsClienteAssignOpen] = useState(false);

  useEffect(() => {
    if (!isOpen || !articulo) return;

    setError(null);

    const gruposDelArticulo = grupos.filter((grupo) =>
      articulosXGrupo.some(
        (rel) => rel.id_articulo === articulo.id_articulo && rel.id_grupo_venta === grupo.id_grupo
      )
    );
    const clientesDelArticulo = clientes.filter((cliente) =>
      articulosXClientes.some(
        (rel) => rel.id_articulo === articulo.id_articulo && rel.id_cliente === cliente.id_cliente
      )
    );

    setGruposOriginales(gruposDelArticulo);
    setGruposSeleccionados(gruposDelArticulo);
    setClientesOriginales(clientesDelArticulo);
    setClientesSeleccionados(clientesDelArticulo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, articulo]);

  const handleGuardarAsociaciones = async () => {
    if (!articulo) return;

    try {
      setIsLoading(true);
      setError(null);

      const gruposOriginalesIds = new Set(gruposOriginales.map((g) => g.id_grupo));
      const gruposSeleccionadosIds = new Set(gruposSeleccionados.map((g) => g.id_grupo));
      const gruposAAgregar = gruposSeleccionados.filter((g) => !gruposOriginalesIds.has(g.id_grupo));
      const gruposAQuitar = gruposOriginales.filter((g) => !gruposSeleccionadosIds.has(g.id_grupo));

      const clientesOriginalesIds = new Set(clientesOriginales.map((c) => c.id_cliente));
      const clientesSeleccionadosIds = new Set(clientesSeleccionados.map((c) => c.id_cliente));
      const clientesAAgregar = clientesSeleccionados.filter((c) => !clientesOriginalesIds.has(c.id_cliente));
      const clientesAQuitar = clientesOriginales.filter((c) => !clientesSeleccionadosIds.has(c.id_cliente));

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
        ...clientesAAgregar.map((cliente) =>
          fetch(`/api/articulos/${articulo.id_articulo}/clientes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_cliente: cliente.id_cliente }),
          })
        ),
        ...clientesAQuitar.map((cliente) =>
          fetch(`/api/articulos/${articulo.id_articulo}/clientes/${cliente.id_cliente}`, {
            method: 'DELETE',
          })
        ),
      ]);

      if (resultados.some((r) => !r.ok)) {
        throw new Error('Hubo un error al actualizar los grupos o colegios asociados.');
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
              <Dialog.Panel className='w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all'>
                <Dialog.Title as='h3' className='text-lg font-medium leading-6 text-gray-900 mb-4'>
                  Editar Grupos y Colegios
                </Dialog.Title>

                {error && (
                  <div className='mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex flex-col'>
                    <span>Error al editar el articulo</span>
                    <span className='text-red-500 text-xs'>{error}</span>
                  </div>
                )}

                <div className='space-y-4'>
                  {/* Grupos de Articulos */}
                  <div>
                    <div className='flex gap-3 items-center mb-3'>
                      <label className='block text-sm font-medium text-gray-700'>Grupos de Articulos</label>
                      <button
                        type='button'
                        onClick={() => setIsGrupoAssignOpen(true)}
                        className='text-sm px-2 py-1 border border-violet-600 text-violet-600 rounded hover:bg-amber-50 transition-colors cursor-pointer'
                      >
                        Asignar a un Nuevo Grupo
                      </button>
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

                  {/* Clientes */}
                  <div>
                    <div className='flex gap-3 items-center mb-3'>
                      <label className='block text-sm font-medium text-gray-700'>Clientes</label>
                      <button
                        type='button'
                        onClick={() => setIsClienteAssignOpen(true)}
                        className='text-sm px-2 py-1 border border-violet-600 text-violet-600 rounded hover:bg-amber-50 transition-colors cursor-pointer'
                      >
                        Asignar a un Nuevo Cliente
                      </button>
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
                </div>

                {/* Botones */}
                <div className='mt-6 flex gap-3'>
                  <button
                    onClick={onClose}
                    className='flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors cursor-pointer'
                  >
                    Cerrar
                  </button>
                  <button
                    onClick={handleGuardarAsociaciones}
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

      {/* Modal de Asignación de Grupos */}
      <SelectListModal
        isOpen={isGrupoAssignOpen}
        onClose={() => setIsGrupoAssignOpen(false)}
        title='Asignar a un Grupo'
        opciones={grupos
          .filter((g) => !gruposSeleccionados.some((sel) => sel.id_grupo === g.id_grupo))
          .map((g) => ({ id: g.id_grupo, nombre: g.nombre_grupo ?? `Grupo ${g.id_grupo}` }))}
        onSelect={(opcion) => {
          const grupo = grupos.find((g) => g.id_grupo === opcion.id);
          if (grupo) {
            setGruposSeleccionados((prev) => [...prev, grupo]);
          }
          setIsGrupoAssignOpen(false);
        }}
      />

      {/* Modal de Asignación de Clientes */}
      <SelectListModal
        isOpen={isClienteAssignOpen}
        onClose={() => setIsClienteAssignOpen(false)}
        title='Asignar a un Cliente'
        opciones={clientes
          .filter((c) => !clientesSeleccionados.some((sel) => sel.id_cliente === c.id_cliente))
          .map((c) => ({ id: c.id_cliente, nombre: c.nombre }))}
        onSelect={(opcion) => {
          const cliente = clientes.find((c) => c.id_cliente === opcion.id);
          if (cliente) {
            setClientesSeleccionados((prev) => [...prev, cliente]);
          }
          setIsClienteAssignOpen(false);
        }}
      />
    </Transition>
  );
}
