import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import type { GRUPOS_DE_VENTA } from '../../backend/generated/prisma/client';
import InlineFilterDropdown from './InlineFilterDropdown';

export type TipoAgrupacion = 'grupo' | 'subgrupo' | 'colegio';

interface OpcionCreada {
  id: number;
  nombre: string;
}

/** Si se pasa, el modal edita ese registro en vez de crear uno nuevo. */
export interface EdicionAgrupacion {
  id: number;
  nombre: string;
  idGrupo?: number | null;
  tipoCliente?: 1 | 2;
}

interface CrearAgrupacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGuardado: (opcion: OpcionCreada) => void;
  tipo: TipoAgrupacion;
  grupos: GRUPOS_DE_VENTA[];
  /** Grupo activo al abrir el modal (si el usuario ya tenia uno filtrado). */
  grupoPreseleccionado?: number | null;
  edicion?: EdicionAgrupacion | null;
}

const TITULOS: Record<TipoAgrupacion, string> = {
  grupo: 'Crear Grupo',
  subgrupo: 'Crear Subgrupo',
  colegio: 'Crear Colegio/Club',
};

const TITULOS_EDICION: Record<TipoAgrupacion, string> = {
  grupo: 'Editar Grupo',
  subgrupo: 'Editar Subgrupo',
  colegio: 'Editar Colegio/Club',
};

const NOMBRE_MAX: Record<TipoAgrupacion, number> = {
  grupo: 50,
  subgrupo: 30,
  colegio: 30,
};

export default function CrearAgrupacionModal({
  isOpen,
  onClose,
  onGuardado,
  tipo,
  grupos,
  grupoPreseleccionado = null,
  edicion = null,
}: CrearAgrupacionModalProps) {
  const [nombre, setNombre] = useState('');
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<number | null>(null);
  const [tipoCliente, setTipoCliente] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modoEdicion = edicion !== null;

  useEffect(() => {
    if (!isOpen) return;
    setNombre(edicion?.nombre ?? '');
    setGrupoSeleccionado(edicion?.idGrupo ?? grupoPreseleccionado);
    setTipoCliente(edicion?.tipoCliente ?? 1);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, tipo, edicion]);

  const maxLength = NOMBRE_MAX[tipo];

  const handleClose = () => {
    if (isLoading) return;
    onClose();
  };

  const handleGuardar = async () => {
    const nombreTrimeado = nombre.trim();
    if (nombreTrimeado === '') {
      setError('El nombre es obligatorio.');
      return;
    }
    if (tipo === 'subgrupo' && grupoSeleccionado === null) {
      setError('Elegí un grupo para el subgrupo.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const metodo = modoEdicion ? 'PUT' : 'POST';
      let respuesta: Response;
      if (tipo === 'grupo') {
        const url = modoEdicion ? `/api/grupos/${edicion!.id}` : '/api/grupos';
        respuesta = await fetch(url, {
          method: metodo,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre_grupo: nombreTrimeado }),
        });
      } else if (tipo === 'subgrupo') {
        const url = modoEdicion ? `/api/subgrupos/${edicion!.id}` : '/api/subgrupos';
        respuesta = await fetch(url, {
          method: metodo,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre_subgrupo: nombreTrimeado, id_grupo: grupoSeleccionado }),
        });
      } else {
        const url = modoEdicion ? `/api/clientes/${edicion!.id}` : '/api/clientes';
        respuesta = await fetch(url, {
          method: metodo,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre: nombreTrimeado, grupo_venta_exclusivo: tipoCliente }),
        });
      }

      const data = await respuesta.json();
      if (!respuesta.ok) {
        throw new Error(data.message || data.details || 'No se pudo guardar el registro.');
      }

      const opcionGuardada: OpcionCreada =
        tipo === 'grupo'
          ? { id: data.id_grupo, nombre: data.nombre_grupo }
          : tipo === 'subgrupo'
          ? { id: data.id_subgrupo, nombre: data.nombre_subgrupo }
          : { id: data.id_cliente, nombre: data.nombre };

      onGuardado(opcionGuardada);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as='div' className='relative z-[70]' onClose={handleClose}>
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
                  {modoEdicion ? TITULOS_EDICION[tipo] : TITULOS[tipo]}
                </Dialog.Title>

                {error && (
                  <div className='mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex flex-col'>
                    <span className='text-red-500 text-xs'>{error}</span>
                  </div>
                )}

                <div className='space-y-4'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>Nombre</label>
                    <input
                      type='text'
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value.slice(0, maxLength))}
                      maxLength={maxLength}
                      placeholder='Nombre'
                      className='w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500'
                    />
                  </div>

                  {tipo === 'subgrupo' && (
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>Grupo</label>
                      <InlineFilterDropdown
                        label='Elegir Grupo'
                        opciones={grupos.map((g) => ({
                          id: g.id_grupo,
                          nombre: g.nombre_grupo ?? `Grupo ${g.id_grupo}`,
                        }))}
                        selectedId={grupoSeleccionado}
                        onSelect={setGrupoSeleccionado}
                        onClear={() => setGrupoSeleccionado(null)}
                      />
                    </div>
                  )}

                  {tipo === 'colegio' && (
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>Tipo</label>
                      <div className='relative inline-flex w-full border-2 border-gray-300 rounded-lg bg-gray-100 p-1 gap-2'>
                        <div
                          className={`absolute top-1 bottom-1 rounded-md bg-violet-600 transition-all duration-300 ease-in-out ${
                            tipoCliente === 2 ? 'left-1/2 right-1' : 'left-1 right-1/2'
                          }`}
                        />
                        <button
                          type='button'
                          onClick={() => setTipoCliente(1)}
                          className={`relative flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors duration-300 cursor-pointer ${
                            tipoCliente === 1 ? 'text-white' : 'text-gray-900 hover:bg-gray-300'
                          }`}
                        >
                          Colegio
                        </button>
                        <button
                          type='button'
                          onClick={() => setTipoCliente(2)}
                          className={`relative flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors duration-300 cursor-pointer ${
                            tipoCliente === 2 ? 'text-white' : 'text-gray-900 hover:bg-gray-300'
                          }`}
                        >
                          Club
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className='mt-6 flex gap-3'>
                  <button
                    onClick={handleClose}
                    disabled={isLoading}
                    className='flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-60'
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleGuardar}
                    disabled={isLoading}
                    className='flex-1 px-4 py-2 cursor-pointer text-sm font-medium text-white bg-violet-600 rounded-md hover:bg-violet-700 disabled:bg-violet-400 transition-colors'
                  >
                    {isLoading
                      ? modoEdicion
                        ? 'Guardando...'
                        : 'Creando...'
                      : modoEdicion
                      ? 'Guardar'
                      : 'Crear'}
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
