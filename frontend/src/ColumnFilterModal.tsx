import { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';

export type FiltroTexto = { tipo: 'texto'; valor: string };
export type FiltroRango = { tipo: 'rango'; desde: number | null; hasta: number | null };
export type FiltroSeleccion = { tipo: 'seleccion'; ids: number[] };
export type FiltroColumna = FiltroTexto | FiltroRango | FiltroSeleccion;

export type OpcionFiltro = { id: number; nombre: string };

interface ColumnFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  titulo: string;
  tipo: 'texto' | 'rango' | 'seleccion' | null;
  filtroActual?: FiltroColumna;
  opciones?: OpcionFiltro[];
  onAplicar: (filtro: FiltroColumna | null) => void;
}

export default function ColumnFilterModal({
  isOpen,
  onClose,
  titulo,
  tipo,
  filtroActual,
  opciones = [],
  onAplicar,
}: ColumnFilterModalProps) {
  const [valorTexto, setValorTexto] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [idsSeleccionados, setIdsSeleccionados] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);

    if (tipo === 'texto') {
      setValorTexto(filtroActual?.tipo === 'texto' ? filtroActual.valor : '');
    } else if (tipo === 'rango') {
      const rango = filtroActual?.tipo === 'rango' ? filtroActual : null;
      setDesde(rango && rango.desde !== null ? String(rango.desde) : '');
      setHasta(rango && rango.hasta !== null ? String(rango.hasta) : '');
    } else if (tipo === 'seleccion') {
      const seleccion = filtroActual?.tipo === 'seleccion' ? filtroActual.ids : null;
      setIdsSeleccionados(new Set(seleccion ?? opciones.map((o) => o.id)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, tipo]);

  const toggleId = (id: number) => {
    setIdsSeleccionados((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });
  };

  const handleAplicar = () => {
    if (tipo === 'texto') {
      const valor = valorTexto.trim();
      onAplicar(valor === '' ? null : { tipo: 'texto', valor });
      onClose();
      return;
    }

    if (tipo === 'rango') {
      const textoDesde = desde.trim();
      const textoHasta = hasta.trim();
      const valorDesde = textoDesde === '' ? null : Number(textoDesde);
      const valorHasta = textoHasta === '' ? null : Number(textoHasta);

      if (valorDesde !== null && Number.isNaN(valorDesde)) {
        setError('El valor "Desde" debe ser un número.');
        return;
      }
      if (valorHasta !== null && Number.isNaN(valorHasta)) {
        setError('El valor "Hasta" debe ser un número.');
        return;
      }
      if (valorDesde !== null && valorHasta !== null && valorDesde > valorHasta) {
        setError('El valor "Desde" no puede ser mayor que el valor "Hasta".');
        return;
      }

      setError(null);
      onAplicar(valorDesde === null && valorHasta === null ? null : { tipo: 'rango', desde: valorDesde, hasta: valorHasta });
      onClose();
      return;
    }

    if (tipo === 'seleccion') {
      const todasSeleccionadas = opciones.length > 0 && idsSeleccionados.size === opciones.length;
      onAplicar(todasSeleccionadas ? null : { tipo: 'seleccion', ids: [...idsSeleccionados] });
      onClose();
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
              <Dialog.Panel className='w-full max-w-sm transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all'>
                <Dialog.Title as='h3' className='text-lg font-medium leading-6 text-gray-900 mb-4'>
                  Filtrar por {titulo}
                </Dialog.Title>

                {error && (
                  <div className='mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm'>
                    {error}
                  </div>
                )}

                {tipo === 'texto' && (
                  <input
                    type='text'
                    autoFocus
                    value={valorTexto}
                    onChange={(e) => setValorTexto(e.target.value)}
                    placeholder={`Buscar en ${titulo}...`}
                    className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500'
                  />
                )}

                {tipo === 'rango' && (
                  <div className='flex gap-3'>
                    <div className='flex-1'>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>Desde</label>
                      <input
                        type='number'
                        value={desde}
                        onChange={(e) => setDesde(e.target.value)}
                        placeholder='Sin límite'
                        className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500'
                      />
                    </div>
                    <div className='flex-1'>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>Hasta</label>
                      <input
                        type='number'
                        value={hasta}
                        onChange={(e) => setHasta(e.target.value)}
                        placeholder='Sin límite'
                        className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500'
                      />
                    </div>
                  </div>
                )}

                {tipo === 'seleccion' && (
                  <div>
                    <button
                      type='button'
                      onClick={() => setIdsSeleccionados(new Set(opciones.map((o) => o.id)))}
                      className='w-full mb-3 px-3 py-1.5 text-sm font-medium text-violet-600 border border-violet-600 rounded-md hover:bg-violet-50 transition-colors cursor-pointer'
                    >
                      Ver todos
                    </button>

                    {opciones.length === 0 ? (
                      <p className='text-sm text-gray-400 italic'>No hay opciones disponibles.</p>
                    ) : (
                      <ul className='max-h-60 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-md'>
                        {opciones.map((opcion) => (
                          <li key={opcion.id}>
                            <label className='flex items-center gap-2 px-3 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50'>
                              <input
                                type='checkbox'
                                checked={idsSeleccionados.has(opcion.id)}
                                onChange={() => toggleId(opcion.id)}
                                className='cursor-pointer accent-violet-600'
                              />
                              {opcion.nombre}
                            </label>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                <div className='mt-6 flex gap-3'>
                  <button
                    onClick={onClose}
                    className='flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors cursor-pointer'
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAplicar}
                    className='flex-1 px-4 py-2 cursor-pointer text-sm font-medium text-white bg-violet-600 rounded-md hover:bg-violet-700 transition-colors'
                  >
                    Aplicar
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
