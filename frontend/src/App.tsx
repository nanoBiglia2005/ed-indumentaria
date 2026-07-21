import { useState, useEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { ArticuloConRelaciones } from '../../backend/types';
import type {
  GRUPOS_DE_ARTICULOS,
  CLIENTES,
  COLORES,
  TALLES,
  ARTICULOS_X_GRUPO,
  ARTICULOS_X_CLIENTES,
} from '../../backend/generated/prisma/client';
import CreateArticleModal from './CreateArticleModal';
import EditArticleModal from './EditArticleModal';
import EditFieldModal from './EditFieldModal';
import type { CampoEditable } from './EditFieldModal';
import SelectListModal from './SelectListModal';
import Sidebar from './Sidebar';

type Opcion = { id: number; nombre: string };

function resaltarCoincidencia(texto: string, termino: string): ReactNode {
  if (!termino) return texto;

  const escapado = termino.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const partes = texto.split(new RegExp(`(${escapado})`, 'gi'));
  if (partes.length === 1) return texto;

  const terminoLower = termino.toLowerCase();
  return partes.map((parte, i) =>
    parte.toLowerCase() === terminoLower ? (
      <mark key={i} className='bg-violet-300 text-inherit rounded-sm'>
        {parte}
      </mark>
    ) : (
      <span key={i}>{parte}</span>
    )
  );
}

const ALTO_LINEA = 20;
const PADDING_VERTICAL_FILA = 24;
const BORDE_FILA = 1;
const MAX_LINEAS_CELDA = 3;
const ROW_HEIGHT = MAX_LINEAS_CELDA * ALTO_LINEA + PADDING_VERTICAL_FILA + BORDE_FILA;

function FilterDropdown({
  label,
  opciones,
  selectedId,
  textSize,
  onSelect,
  onClear,
}: {
  label: string;
  textSize: string;
  opciones: Opcion[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onClear: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const seleccionada = opciones.find((o) => o.id === selectedId) ?? null;

  return (
    <div className='relative'>
      <button
        onClick={() => setAbierto(true)}
        className={`flex items-center justify-between gap-2 px-4 py-1 rounded border min-w-[140px] cursor-pointer font-semibold text-violet-500 hover:bg-amber-400
          hover:text-white transition-color duration-100 ease-in ${
          seleccionada ? 'bg-violet-500 text-white' : ''
        }`}
      >
        <span className={`text-${textSize}`}>{seleccionada ? seleccionada.nombre : label}</span>
        {seleccionada && (
          <span
            role='button'
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className='font-bold ps-1 hover:text-red-600'
          >
            X
          </span>
        )}
      </button>

      <SelectListModal
        isOpen={abierto}
        onClose={() => setAbierto(false)}
        title={label}
        opciones={opciones}
        onSelect={(opcion) => {
          onSelect(opcion.id);
          setAbierto(false);
        }}
      />
    </div>
  );
}

function New() {
  const [datosBackend, setDatosBackend] = useState<ArticuloConRelaciones[]>([]);

  const [grupos, setGrupos] = useState<GRUPOS_DE_ARTICULOS[]>([]);
  const [clientes, setClientes] = useState<CLIENTES[]>([]);
  const [colores, setColores] = useState<COLORES[]>([]);
  const [talles, setTalles] = useState<TALLES[]>([]);

  const [articulosXGrupo, setArticulosXGrupo] = useState<ARTICULOS_X_GRUPO[]>([]);
  const [articulosXClientes, setArticulosXClientes] = useState<ARTICULOS_X_CLIENTES[]>([]);

  const [grupoSeleccionado, setGrupoSeleccionado] = useState<number | null>(null);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<number | null>(null);

  const [busquedaInput, setBusquedaInput] = useState('');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => setBusqueda(busquedaInput.trim()), 150);
    return () => clearTimeout(timeout);
  }, [busquedaInput]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [articuloAEditar, setArticuloAEditar] = useState<ArticuloConRelaciones | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [campoAEditar, setCampoAEditar] = useState<CampoEditable | null>(null);
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);

  type ColumnaArticulo = {
    header: string;
    render: (item: ArticuloConRelaciones) => ReactNode;
    extraClassName?: (item: ArticuloConRelaciones) => string;
    campo?: CampoEditable;
    width: number;
  };

  const columnas: ColumnaArticulo[] = useMemo(() => [
    {
      header: 'Vigente',
      render: (item) => (item.vigente ? 'Vigente' : 'No Vigente'),
      extraClassName: (item) => (item.vigente ? 'text-green-500' : 'text-red-500'),
      width: 90,
    },
    {
      header: 'Código de Barra',
      render: (item) => (item.barcode ? '77900000' + item.barcode : 'No Asignado'),
      extraClassName: (item) => (!item.barcode ? 'text-gray-400 text-sm flex justify-center' : ''),
      campo: 'barcode',
      width: 170,
    },
    { header: 'Talle',
      render: (item) => item.TALLES?.nombre_talle,
      extraClassName: (item) => (item.TALLES?.id_talle == 0 ? 'text-gray-400 text-sm flex justify-center' : ''),
      campo: 'id_talle',
      width: 130 },
    { header: 'Cantidad', render: (item) => item.cant, campo: 'cant', width: 100 },
    {
      header: 'Cantidad Reservada',
      render: (item) => item.cant_reservada,
      campo: 'cant_reservada',
      width: 175,
    },
    {
      header: 'Cantidad Minima',
      render: (item) => item.stock_minimo,
      campo: 'stock_minimo',
      width: 153,
    },
    { header: 'Precio', render: (item) => `${item.precio}$`, campo: 'precio', width: 120 },
    { header: 'Color',
      render: (item) => item.COLORES?.nombre_color,
      extraClassName: (item) => (item.COLORES?.id_color == 1 ? 'text-gray-400 text-sm flex justify-center' : ''),
      campo: 'id_color',
      width: 140 },
    {
      header: 'Descripción',
      render: (item) => item.descripcion ?? 'Sin Descripción',
      extraClassName: (item) => (!item.descripcion ? 'text-gray-400 text-sm flex justify-center' : ''),
      campo: 'descripcion',
      width: 220,
    },
  ], []);

  const gridTemplateColumns = `${columnas.map((c) => `${c.width}px`).join(' ')} minmax(140px, 1fr)`;

  const scrollParentRef = useRef<HTMLDivElement>(null);

  const fetchArticulos = () => {
    fetch('/api/articulos')
      .then((respuesta) => respuesta.json())
      .then((articulos) => {
        setDatosBackend(articulos);
      })
      .catch((error) => {
        console.error('Error al conectar con el backend:', error);
      });
  };

  const fetchArticulosXGrupo = () => {
    fetch('/api/articulos-x-grupo')
      .then((respuesta) => respuesta.json())
      .then((data) => setArticulosXGrupo(data))
      .catch((error) => console.error('Error al obtener ARTICULOS_X_GRUPO:', error));
  };

  const fetchArticulosXClientes = () => {
    fetch('/api/articulos-x-clientes')
      .then((respuesta) => respuesta.json())
      .then((data) => setArticulosXClientes(data))
      .catch((error) => console.error('Error al obtener ARTICULOS_X_CLIENTES:', error));
  };

  const handleArticuloCreado = () => {
    fetchArticulos();
    fetchArticulosXGrupo();
    fetchArticulosXClientes();
  };

  const handleArticuloActualizado = () => {
    fetchArticulos();
    fetchArticulosXGrupo();
    fetchArticulosXClientes();
  };

  const abrirEdicionCompleta = (articulo: ArticuloConRelaciones) => {
    setArticuloAEditar(articulo);
    setIsEditModalOpen(true);
  };

  const abrirEdicionCampo = (articulo: ArticuloConRelaciones, campo: CampoEditable) => {
    setArticuloAEditar(articulo);
    setCampoAEditar(campo);
    setIsFieldModalOpen(true);
  };

  useEffect(() => {
    fetchArticulos();

    fetch('/api/grupos')
      .then((respuesta) => respuesta.json())
      .then((data) => setGrupos(data))
      .catch((error) => console.error('Error al obtener los grupos:', error));

    fetch('/api/clientes')
      .then((respuesta) => respuesta.json())
      .then((data) => setClientes(data))
      .catch((error) => console.error('Error al obtener los clientes:', error));

    fetch('/api/colores')
      .then((respuesta) => respuesta.json())
      .then((data) => setColores(data))
      .catch((error) => console.error('Error al obtener los colores:', error));

    fetch('/api/talles')
      .then((respuesta) => respuesta.json())
      .then((data) => setTalles(data))
      .catch((error) => console.error('Error al obtener los talles:', error));

    fetchArticulosXGrupo();
    fetchArticulosXClientes();
  }, []);

  const articulosFiltrados = useMemo(() => {
    let articulosFiltrados = datosBackend;

    if (grupoSeleccionado !== null) {
      const idsDelGrupo = new Set(
        articulosXGrupo
          .filter((registro) => registro.id_grupo === grupoSeleccionado)
          .map((registro) => registro.id_articulo)
      );
      articulosFiltrados = articulosFiltrados.filter((articulo) =>
        idsDelGrupo.has(articulo.id_articulo)
      );
    }

    if (clienteSeleccionado !== null) {
      const idsDelCliente = new Set(
        articulosXClientes
          .filter((registro) => registro.id_cliente === clienteSeleccionado)
          .map((registro) => registro.id_articulo)
      );
      articulosFiltrados = articulosFiltrados.filter((articulo) =>
        idsDelCliente.has(articulo.id_articulo)
      );
    }

    if (busqueda !== '') {
      const termino = busqueda.toLowerCase();
      articulosFiltrados = articulosFiltrados.filter((articulo) =>
        columnas.some((columna) => String(columna.render(articulo) ?? '').toLowerCase().includes(termino))
      );
    }

    articulosFiltrados.sort((a,b) => {
      const orden = a.TALLES.nombre_talle.localeCompare(b.TALLES.nombre_talle);
      return (orden ? orden : 0);
    })

    return articulosFiltrados;
  }, [datosBackend, articulosXGrupo, articulosXClientes, grupoSeleccionado, clienteSeleccionado, busqueda, columnas]);

  const rowVirtualizer = useVirtualizer({
    count: articulosFiltrados.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const clientesFiltrados = useMemo(() => {
    if (grupoSeleccionado === null) return clientes;

    const idsDelGrupo = new Set(
      articulosXGrupo
        .filter((registro) => registro.id_grupo === grupoSeleccionado)
        .map((registro) => registro.id_articulo)
    );

    const idsClientesDelGrupo = new Set(
      articulosXClientes
        .filter((registro) => registro.id_cliente !== null && idsDelGrupo.has(registro.id_articulo))
        .map((registro) => registro.id_cliente)
    );

    return clientes.filter((cliente) => idsClientesDelGrupo.has(cliente.id_cliente));
  }, [grupoSeleccionado, articulosXGrupo, articulosXClientes, clientes]);

  useEffect(() => {
    if (
      clienteSeleccionado !== null &&
      !clientesFiltrados.some((cliente) => cliente.id_cliente === clienteSeleccionado)
    ) {
      setClienteSeleccionado(null);
    }
  }, [clientesFiltrados, clienteSeleccionado]);

  return (
    <>
      <div className='flex h-screen'>
        <Sidebar />
        <div className='flex flex-col justify-center flex-1 min-w-0 px-10 py-6'>
        <div className='border px-3 rounded-xl border-violet-500 h-full min-w-0 flex flex-col shadow-xl'>
        <div className='flex my-4 gap-4 shrink-0 select-none'>
          <button
            onClick={() => setIsModalOpen(true)}
            className='rounded flex items-center py-2 px-3 text-white font-semibold text-lg border cursor-pointer bg-violet-500 transition-color
            duration-100 ease-in'
          >
            <span>Nuevo Articulo</span>
          </button>
          <div className='flex items-center gap-2'>
            <FilterDropdown
              label='Filtrar por Grupo'
              textSize='xl'
              opciones={grupos.map((g) => ({
                id: g.id_grupo_articulo,
                nombre: g.nombre_grupo ?? `Grupo ${g.id_grupo_articulo}`,
              }))}
              selectedId={grupoSeleccionado}
              onSelect={setGrupoSeleccionado}
              onClear={() => setGrupoSeleccionado(null)}
            />

            <FilterDropdown
            textSize='xl'
              label='Filtrar por Colegio'
              opciones={clientesFiltrados.map((c) => ({
                id: c.id_cliente,
                nombre: c.nombre,
              }))}
              selectedId={clienteSeleccionado}
              onSelect={setClienteSeleccionado}
              onClear={() => setClienteSeleccionado(null)}
            />
          </div>

          <div className='relative ml-auto w-72 flex items-center'>
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
              value={busquedaInput}
              onChange={(e) => setBusquedaInput(e.target.value)}
              placeholder='Buscar articulo...'
              className='w-full rounded border border-gray-300 bg-white py-1.5 pl-9 pr-8 text-sm text-gray-700 placeholder:text-gray-400 transition-colors duration-100 ease-in hover:border-violet-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30'
            />
            {busquedaInput && (
              <button
                type='button'
                onClick={() => setBusquedaInput('')}
                className='absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer font-bold text-gray-400 hover:text-violet-600'
              >
                ×
              </button>
            )}
          </div>
        </div>
        <div ref={scrollParentRef} className='flex-1 min-h-0 w-full min-w-0 overflow-auto border rounded-xl border-black/30 mb-5 select-none shadow'>
          <div
            className='grid text-black sticky top-0 z-10 isolate will-change-transform'
            style={{ gridTemplateColumns, transform: 'translateZ(0)' }}
          >
            {columnas.map((columna, i) => (
              <span
                key={columna.header}
                className={`py-3 px-4 border-black/35 bg-stone-100 text-[15px] font-medium border-b ${
                  i > 0 ? 'border-l' : ''
                }`}
              >
                {columna.header}
              </span>
            ))}
            <span className='py-3 border-black/35 bg-stone-100 border-b border-l'>
            </span>
          </div>

          <div style={{ position: 'relative', height: rowVirtualizer.getTotalSize() }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const item = articulosFiltrados[virtualRow.index];
              return (
                <div
                  key={item.id_articulo}
                  className='grid text-black text-[15px] group absolute top-0 left-0 w-full'
                  style={{
                    gridTemplateColumns,
                    height: ROW_HEIGHT,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {columnas.map((columna, i) => {
                    const valorTexto = String(columna.render(item) ?? '');
                    return (
                      <p
                        key={columna.header}
                        onClick={columna.campo ? () => abrirEdicionCampo(item, columna.campo!) : undefined}
                        className={`py-3 px-4 border-black/20 border-b flex items-center break-words group-hover:bg-amber-50 transition-color duration-100 ease-in ${
                          i > 0 ? 'border-l' : ''
                        } ${columna.campo ? 'cursor-pointer hover:bg-amber-300' : ''} ${
                          columna.extraClassName ? columna.extraClassName(item) : ''
                        }`}
                      >
                        <span
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: MAX_LINEAS_CELDA,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {busqueda ? resaltarCoincidencia(valorTexto, busqueda) : valorTexto}
                        </span>
                      </p>
                    );
                  })}
                  <div
                    className={`py-3 border-black/20 border-l border-b group-hover:bg-amber-50 transition-color duration-100 ease-in flex items-center justify-center`}
                  >
                    <button
                      type='button'
                      onClick={() => abrirEdicionCompleta(item)}
                      className='rounded border opacity-0 group-hover:opacity-100 border-violet-500 bg-violet-500 px-3 py-1 text-sm font-semibold text-white cursor-pointer transition-color duration-100 ease-in hover:bg-violet-600 active:bg-violet-700'
                    >
                      Editar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      </div>
      </div>

      <CreateArticleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleArticuloCreado}
        grupos={grupos}
        clientes={clientes}
      />

      <EditArticleModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleArticuloActualizado}
        articulo={articuloAEditar}
        grupos={grupos}
        clientes={clientes}
        articulosXGrupo={articulosXGrupo}
        articulosXClientes={articulosXClientes}
      />

      <EditFieldModal
        isOpen={isFieldModalOpen}
        onClose={() => setIsFieldModalOpen(false)}
        onSuccess={handleArticuloActualizado}
        articulo={articuloAEditar}
        campo={campoAEditar}
        talles={talles}
        colores={colores}
      />
    </>
    
  );
}

export default New;
