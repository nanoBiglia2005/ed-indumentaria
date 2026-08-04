import { useEffect, useMemo, useRef, useState, Fragment } from 'react';
import type { ReactNode } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type {
  ARTICULOS,
  GRUPOS_DE_VENTA,
  CLIENTES,
  ARTICULOS_X_GRUPO_VENTA,
  ARTICULOS_X_CLIENTE,
  SUBGRUPOS_DE_VENTA,
} from '../../backend/generated/prisma/client';
import InlineFilterDropdown from './InlineFilterDropdown';
import { resaltarCoincidencia } from './textUtils';

const ALTO_LINEA = 18;
const PADDING_VERTICAL_FILA = 16;
const BORDE_FILA = 1;
const MAX_LINEAS_CELDA = 3;
const ROW_HEIGHT = MAX_LINEAS_CELDA * ALTO_LINEA + PADDING_VERTICAL_FILA + BORDE_FILA;

type ColumnaArticulo = {
  header: string;
  render: (item: ARTICULOS) => ReactNode;
  extraClassName?: (item: ARTICULOS) => string;
  width: number;
};

const COLUMNAS: ColumnaArticulo[] = [
  {
    header: 'Código de Barra',
    render: (item) => (item.barcode_tail ? '77900000' + item.barcode_tail : 'No Asignado'),
    extraClassName: (item) => (!item.barcode_tail ? 'text-gray-400 text-xs' : ''),
    width: 125,
  },
  {
    header: 'Nombre',
    render: (item) => item.descripcion ?? 'Sin Nombre',
    extraClassName: (item) => (!item.descripcion ? 'text-gray-400 text-xs' : ''),
    width: 230,
  },
  {
    header: 'Talle',
    render: (item) => item.talle ?? 'Sin Talle',
    extraClassName: (item) => (!item.talle ? 'text-gray-400 text-xs' : ''),
    width: 85,
  },
  { header: 'Cantidad', render: (item) => item.cant, width: 75 },
  { header: 'Precio', render: (item) => `${item.precio}$`, width: 80 },
];

const GRID_TEMPLATE_COLUMNS = `${COLUMNAS.map((c) => `${c.width}px`).join(' ')} minmax(95px, 1fr)`;

interface AgregarProductoModalProps {
  isOpen: boolean;
  onClose: () => void;
  articulosExcluidos: number[];
  onAgregar: (articulo: ARTICULOS) => void;
}

export default function AgregarProductoModal({
  isOpen,
  onClose,
  articulosExcluidos,
  onAgregar,
}: AgregarProductoModalProps) {
  const [articulos, setArticulos] = useState<ARTICULOS[]>([]);
  const [grupos, setGrupos] = useState<GRUPOS_DE_VENTA[]>([]);
  const [clientes, setClientes] = useState<CLIENTES[]>([]);
  const [subgrupos, setSubgrupos] = useState<SUBGRUPOS_DE_VENTA[]>([]);
  const [articulosXGrupo, setArticulosXGrupo] = useState<ARTICULOS_X_GRUPO_VENTA[]>([]);
  const [articulosXCliente, setArticulosXCliente] = useState<ARTICULOS_X_CLIENTE[]>([]);

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [grupoSeleccionado, setGrupoSeleccionado] = useState<number | null>(null);
  const [subgrupoSeleccionado, setSubgrupoSeleccionado] = useState<number | null>(null);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<number | null>(null);
  const [busqueda, setBusqueda] = useState('');

  const scrollParentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    setGrupoSeleccionado(null);
    setSubgrupoSeleccionado(null);
    setClienteSeleccionado(null);
    setBusqueda('');
    setError(null);
    setCargando(true);

    Promise.all([
      fetch('/api/articulos').then((r) => {
        if (!r.ok) throw new Error('No se pudieron obtener los articulos.');
        return r.json();
      }),
      fetch('/api/grupos').then((r) => {
        if (!r.ok) throw new Error('No se pudieron obtener los grupos.');
        return r.json();
      }),
      fetch('/api/clientes').then((r) => {
        if (!r.ok) throw new Error('No se pudieron obtener los colegios.');
        return r.json();
      }),
      fetch('/api/subgrupos').then((r) => {
        if (!r.ok) throw new Error('No se pudieron obtener los subgrupos.');
        return r.json();
      }),
      fetch('/api/articulos-x-grupo').then((r) => {
        if (!r.ok) throw new Error('No se pudo obtener la relacion de articulos y grupos.');
        return r.json();
      }),
      fetch('/api/articulos-x-cliente').then((r) => {
        if (!r.ok) throw new Error('No se pudo obtener la relacion de articulos y clientes.');
        return r.json();
      }),
    ])
      .then(
        ([articulosData, gruposData, clientesData, subgruposData, articulosXGrupoData, articulosXClienteData]) => {
          setArticulos(articulosData);
          setGrupos(gruposData);
          setClientes(clientesData);
          setSubgrupos(subgruposData);
          setArticulosXGrupo(articulosXGrupoData);
          setArticulosXCliente(articulosXClienteData);
        }
      )
      .catch((err) => {
        console.error('Error al obtener los datos para agregar productos:', err);
        setError('No se pudieron cargar los articulos disponibles.');
      })
      .finally(() => setCargando(false));
  }, [isOpen]);

  const subgruposFiltrados = useMemo(() => {
    if (grupoSeleccionado === null) return [];
    return subgrupos.filter((subgrupo) => subgrupo.id_grupo === grupoSeleccionado);
  }, [grupoSeleccionado, subgrupos]);

  useEffect(() => {
    if (
      subgrupoSeleccionado !== null &&
      !subgruposFiltrados.some((subgrupo) => subgrupo.id_subgrupo === subgrupoSeleccionado)
    ) {
      setSubgrupoSeleccionado(null);
    }
  }, [subgruposFiltrados, subgrupoSeleccionado]);

  const articulosFiltrados = useMemo(() => {
    const excluidos = new Set(articulosExcluidos);
    let resultado = articulos.filter((articulo) => articulo.vigente && !excluidos.has(articulo.id_articulo));

    if (grupoSeleccionado !== null) {
      const idsDelGrupo = new Set(
        articulosXGrupo
          .filter((registro) => registro.id_grupo_venta === grupoSeleccionado)
          .map((registro) => registro.id_articulo)
      );
      resultado = resultado.filter((articulo) => idsDelGrupo.has(articulo.id_articulo));
    }

    if (grupoSeleccionado !== null && subgrupoSeleccionado !== null) {
      const idsDelSubgrupo = new Set(
        articulosXGrupo
          .filter(
            (registro) =>
              registro.id_grupo_venta === grupoSeleccionado &&
              registro.id_subgrupo === subgrupoSeleccionado
          )
          .map((registro) => registro.id_articulo)
      );
      resultado = resultado.filter((articulo) => idsDelSubgrupo.has(articulo.id_articulo));
    }

    if (clienteSeleccionado !== null) {
      const idsDelCliente = new Set(
        articulosXCliente
          .filter((registro) => registro.id_cliente === clienteSeleccionado)
          .map((registro) => registro.id_articulo)
      );
      resultado = resultado.filter((articulo) => idsDelCliente.has(articulo.id_articulo));
    }

    if (busqueda.trim() !== '') {
      const termino = busqueda.trim().toLowerCase();
      resultado = resultado.filter((articulo) =>
        COLUMNAS.some((columna) => String(columna.render(articulo) ?? '').toLowerCase().includes(termino))
      );
    }

    return resultado;
  }, [
    articulos,
    articulosXGrupo,
    articulosXCliente,
    articulosExcluidos,
    grupoSeleccionado,
    subgrupoSeleccionado,
    clienteSeleccionado,
    busqueda,
  ]);

  const rowVirtualizer = useVirtualizer({
    count: articulosFiltrados.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const handleAgregar = (articulo: ARTICULOS) => {
    onAgregar(articulo);
    onClose();
  };

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
          <div className='fixed inset-0 bg-black/25' />
        </Transition.Child>

        <div className='fixed inset-0 overflow-y-auto select-none'>
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
              <Dialog.Panel className='w-full max-w-3xl transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all'>
                <Dialog.Title as='h3' className='text-lg font-medium leading-6 text-gray-900 mb-4'>
                  Agregar Producto
                </Dialog.Title>

                {error && (
                  <div className='mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex flex-col'>
                    <span>Error al cargar los articulos</span>
                    <span className='text-red-500 text-xs'>{error}</span>
                  </div>
                )}

                <div className='flex flex-wrap items-center gap-2 mb-3'>
                  <InlineFilterDropdown
                    label='Filtrar por Grupo'
                    opciones={grupos.map((g) => ({
                      id: g.id_grupo,
                      nombre: g.nombre_grupo ?? `Grupo ${g.id_grupo}`,
                    }))}
                    selectedId={grupoSeleccionado}
                    onSelect={setGrupoSeleccionado}
                    onClear={() => setGrupoSeleccionado(null)}
                    disabled={cargando}
                  />

                  <InlineFilterDropdown
                      label='Filtrar por Subgrupo'
                      opciones={subgruposFiltrados.map((s) => ({
                        id: s.id_subgrupo,
                        nombre: s.nombre_subgrupo,
                      }))}
                      selectedId={subgrupoSeleccionado}
                      onSelect={setSubgrupoSeleccionado}
                      onClear={() => setSubgrupoSeleccionado(null)}
                      disabled={cargando || grupoSeleccionado === null}
                  />
                  
                  <InlineFilterDropdown
                    label='Filtrar por Colegio'
                    opciones={clientes.map((c) => ({ id: c.id_cliente, nombre: c.nombre }))}
                    selectedId={clienteSeleccionado}
                    onSelect={setClienteSeleccionado}
                    onClear={() => setClienteSeleccionado(null)}
                    disabled={cargando}
                  />

                  <div className='relative flex-1 min-w-[160px] flex items-center'>
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
                      placeholder='Buscar articulo...'
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
                </div>

                <div
                  ref={scrollParentRef}
                  className='max-h-72 overflow-auto border rounded-md border-black/30 select-none'
                >
                  <div
                    className='grid text-black sticky top-0 z-10 isolate will-change-transform'
                    style={{ gridTemplateColumns: GRID_TEMPLATE_COLUMNS, transform: 'translateZ(0)' }}
                  >
                    {COLUMNAS.map((columna, i) => (
                      <span
                        key={columna.header}
                        className={`py-2 px-3 border-black/35 bg-stone-100 text-xs font-medium border-b ${
                          i > 0 ? 'border-l' : ''
                        }`}
                      >
                        {columna.header}
                      </span>
                    ))}
                    <span className='py-2 border-black/35 bg-stone-100 border-b border-l' />
                  </div>

                  {cargando && <p className='px-3 py-4 text-sm text-gray-400 text-center'>Cargando articulos...</p>}

                  {!cargando && !error && articulosFiltrados.length === 0 && (
                    <p className='px-3 py-4 text-sm text-gray-400 italic text-center'>
                      No hay articulos que coincidan con la busqueda
                    </p>
                  )}

                  {!cargando && (
                    <div style={{ position: 'relative', height: rowVirtualizer.getTotalSize() }}>
                      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const item = articulosFiltrados[virtualRow.index];
                        return (
                          <div
                            key={item.id_articulo}
                            onClick={() => handleAgregar(item)}
                            className='grid text-black text-sm group absolute top-0 left-0 w-full cursor-pointer'
                            style={{
                              gridTemplateColumns: GRID_TEMPLATE_COLUMNS,
                              height: ROW_HEIGHT,
                              overflow: 'hidden',
                              transform: `translateY(${virtualRow.start}px)`,
                            }}
                          >
                            {COLUMNAS.map((columna, i) => {
                              const valorTexto = String(columna.render(item) ?? '');
                              return (
                                <p
                                  key={columna.header}
                                  className={`py-2 px-3 border-black/20 border-b flex items-center break-words group-hover:bg-amber-50 transition-color duration-100 ease-in ${
                                    i > 0 ? 'border-l' : ''
                                  } ${columna.extraClassName ? columna.extraClassName(item) : ''}`}
                                >
                                  <span
                                    style={{
                                      display: '-webkit-box',
                                      WebkitLineClamp: MAX_LINEAS_CELDA,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden',
                                      lineHeight: `${ALTO_LINEA}px`,
                                      minWidth: 0,
                                    }}
                                  >
                                    {busqueda ? resaltarCoincidencia(valorTexto, busqueda) : valorTexto}
                                  </span>
                                </p>
                              );
                            })}
                            <div className='py-2 border-black/20 border-l border-b group-hover:bg-amber-50 transition-color duration-100 ease-in flex items-center justify-center'>
                              <button
                                type='button'
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAgregar(item);
                                }}
                                className='rounded border border-violet-500 bg-violet-500 px-3 py-1 text-xs font-semibold text-white cursor-pointer transition-color duration-100 ease-in hover:bg-violet-600 active:bg-violet-700'
                              >
                                Agregar
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

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
