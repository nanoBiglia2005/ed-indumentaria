import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type {
  ARTICULOS,
  GRUPOS_DE_VENTA,
  CLIENTES,
  ARTICULOS_X_GRUPO_VENTA,
  ARTICULOS_X_CLIENTE,
  SUBGRUPOS_DE_VENTA,
} from '../../../backend/generated/prisma/client';
import CreateArticleModal from '../CreateArticleModal';
import EditGruposModal from '../EditGruposModal';
import EditClientesModal from '../EditClientesModal';
import EditSubgruposModal from '../EditSubgruposModal';
import EliminarArticuloModal from '../EliminarArticuloModal';
import EditFieldModal from '../EditFieldModal';
import type { CampoEditable } from '../EditFieldModal';
import SelectListModal from '../SelectListModal';
import CrearAgrupacionModal from '../CrearAgrupacionModal';
import type { TipoAgrupacion } from '../CrearAgrupacionModal';
import { resaltarCoincidencia } from '../textUtils';

const CHIP_MAXIMO = 2;

function ListaDeChips({ nombres, vacioTexto }: { nombres: string[]; vacioTexto: string }) {
  if (nombres.length === 0) {
    return <span className='text-gray-400 text-sm italic'>{vacioTexto}</span>;
  }

  const visibles = nombres.slice(0, CHIP_MAXIMO);
  const restantes = nombres.length - visibles.length;

  return (
    <span className='flex flex-wrap items-center gap-1'>
      {visibles.map((nombre) => (
        <span
          key={nombre}
          className='px-2 py-0.5 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700'
        >
          {nombre}
        </span>
      ))}
      {restantes > 0 && <span className='text-xs text-gray-500 font-medium'>+{restantes}</span>}
    </span>
  );
}

type Opcion = { id: number; nombre: string };

const ALTO_LINEA = 20;
const PADDING_VERTICAL_FILA = 24;
const BORDE_FILA = 1;
const MAX_LINEAS_CELDA = 4;
const ROW_HEIGHT = MAX_LINEAS_CELDA * ALTO_LINEA + PADDING_VERTICAL_FILA + BORDE_FILA;

function FilterDropdown({
  label,
  opciones,
  selectedId,
  textSize,
  onSelect,
  onClear,
  disabled = false,
  onCrear,
  crearLabel,
}: {
  label: string;
  textSize: string;
  opciones: Opcion[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onClear: () => void;
  disabled?: boolean;
  onCrear?: () => void;
  crearLabel?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const seleccionada = opciones.find((o) => o.id === selectedId) ?? null;

  return (
    <div className='relative'>
      <button
        disabled={disabled}
        onClick={() => setAbierto(true)}
        className={`flex items-center justify-between gap-2 px-4 py-1 rounded border min-w-[140px] font-semibold transition-color duration-100 ease-in ${
          disabled
            ? 'cursor-not-allowed border-gray-300 text-gray-400'
            : 'cursor-pointer text-violet-500 hover:bg-amber-400 hover:text-white'
        } ${seleccionada ? 'bg-violet-500 text-white' : ''}`}
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
        onCrear={
          onCrear
            ? () => {
                setAbierto(false);
                onCrear();
              }
            : undefined
        }
        crearLabel={crearLabel}
      />
    </div>
  );
}

function ArticulosPage() {
  const [datosBackend, setDatosBackend] = useState<ARTICULOS[]>([]);

  const [grupos, setGrupos] = useState<GRUPOS_DE_VENTA[]>([]);
  const [clientes, setClientes] = useState<CLIENTES[]>([]);
  const [subgrupos, setSubgrupos] = useState<SUBGRUPOS_DE_VENTA[]>([]);

  const [articulosXGrupo, setArticulosXGrupo] = useState<ARTICULOS_X_GRUPO_VENTA[]>([]);
  const [articulosXCliente, setArticulosXCliente] = useState<ARTICULOS_X_CLIENTE[]>([]);

  const [grupoSeleccionado, setGrupoSeleccionado] = useState<number | null>(null);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<number | null>(null);
  const [subgrupoSeleccionado, setSubgrupoSeleccionado] = useState<number | null>(null);

  const [busquedaInput, setBusquedaInput] = useState('');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => setBusqueda(busquedaInput.trim()), 150);
    return () => clearTimeout(timeout);
  }, [busquedaInput]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [articuloAEditar, setArticuloAEditar] = useState<ARTICULOS | null>(null);
  const [isEditGruposOpen, setIsEditGruposOpen] = useState(false);
  const [isEditClientesOpen, setIsEditClientesOpen] = useState(false);
  const [isEditSubgruposOpen, setIsEditSubgruposOpen] = useState(false);
  const [isEliminarModalOpen, setIsEliminarModalOpen] = useState(false);
  const [campoAEditar, setCampoAEditar] = useState<CampoEditable | null>(null);
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [imprimiendoId, setImprimiendoId] = useState<number | null>(null);
  const [impresoId, setImpresoId] = useState<number | null>(null);
  const [actualizandoVigenciaId, setActualizandoVigenciaId] = useState<number | null>(null);
  const [crearModalTipo, setCrearModalTipo] = useState<TipoAgrupacion | null>(null);

  type ColumnaArticulo = {
    header: string;
    render: (item: ARTICULOS) => ReactNode;
    renderCell?: (item: ARTICULOS) => ReactNode;
    extraClassName?: (item: ARTICULOS) => string;
    campo?: CampoEditable;
    onClick?: (item: ARTICULOS) => void;
    width: number;
  };

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
      .catch((error) => console.error('Error al obtener ARTICULOS_X_GRUPO_VENTA:', error));
  };

  const fetchArticulosXCliente = () => {
    fetch('/api/articulos-x-cliente')
      .then((respuesta) => respuesta.json())
      .then((data) => setArticulosXCliente(data))
      .catch((error) => console.error('Error al obtener ARTICULOS_X_CLIENTE:', error));
  };

  const fetchGrupos = () => {
    fetch('/api/grupos')
      .then((respuesta) => respuesta.json())
      .then((data) => setGrupos(data))
      .catch((error) => console.error('Error al obtener los grupos:', error));
  };

  const fetchSubgrupos = () => {
    fetch('/api/subgrupos')
      .then((respuesta) => respuesta.json())
      .then((data) => setSubgrupos(data))
      .catch((error) => console.error('Error al obtener los subgrupos:', error));
  };

  const fetchClientes = () => {
    fetch('/api/clientes')
      .then((respuesta) => respuesta.json())
      .then((data) => setClientes(data))
      .catch((error) => console.error('Error al obtener los clientes:', error));
  };

  const handleAgrupacionCreada = (opcion: { id: number; nombre: string }) => {
    if (crearModalTipo === 'grupo') {
      fetchGrupos();
      setGrupoSeleccionado(opcion.id);
    } else if (crearModalTipo === 'subgrupo') {
      fetchSubgrupos();
      setSubgrupoSeleccionado(opcion.id);
    } else if (crearModalTipo === 'colegio') {
      fetchClientes();
      setClienteSeleccionado(opcion.id);
    }
    setCrearModalTipo(null);
  };

  const handleArticuloCreado = () => {
    fetchArticulos();
    fetchArticulosXGrupo();
    fetchArticulosXCliente();
  };

  const handleArticuloActualizado = () => {
    fetchArticulos();
    fetchArticulosXGrupo();
    fetchArticulosXCliente();
  };

  const abrirEdicionGrupos = useCallback((articulo: ARTICULOS) => {
    setArticuloAEditar(articulo);
    setIsEditGruposOpen(true);
  }, []);

  const abrirEdicionClientes = useCallback((articulo: ARTICULOS) => {
    setArticuloAEditar(articulo);
    setIsEditClientesOpen(true);
  }, []);

  const abrirEdicionSubgrupos = useCallback((articulo: ARTICULOS) => {
    setArticuloAEditar(articulo);
    setIsEditSubgruposOpen(true);
  }, []);

  const abrirEliminacion = useCallback((articulo: ARTICULOS) => {
    setArticuloAEditar(articulo);
    setIsEliminarModalOpen(true);
  }, []);

  const handleImprimir = async (articulo: ARTICULOS) => {
    setImprimiendoId(articulo.id_articulo);
    try {
      const respuesta = await fetch('/api/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_articulo: articulo.id_articulo, cantidad: 1 }),
      });
      const resultado = await respuesta.json();
      if (!respuesta.ok || resultado.status === 'error') {
        throw new Error(resultado.message ?? resultado.detail ?? 'No se pudo imprimir el articulo.');
      }
      setImpresoId(articulo.id_articulo);
      setTimeout(() => {
        setImpresoId((actual) => (actual === articulo.id_articulo ? null : actual));
      }, 1500);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se pudo imprimir el articulo.');
    } finally {
      setImprimiendoId(null);
    }
  };

  const abrirEdicionCampo = (articulo: ARTICULOS, campo: CampoEditable) => {
    setArticuloAEditar(articulo);
    setCampoAEditar(campo);
    setIsFieldModalOpen(true);
  };

  const handleToggleVigente = useCallback(
    async (articulo: ARTICULOS) => {
      setActualizandoVigenciaId((actual) => {
        if (actual !== null) return actual;
        return articulo.id_articulo;
      });

      try {
        const respuesta = await fetch(`/api/articulos/${articulo.id_articulo}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vigente: !articulo.vigente }),
        });
        if (!respuesta.ok) {
          const errorData = await respuesta.json();
          throw new Error(errorData.details || errorData.message);
        }
        fetchArticulos();
      } catch (error) {
        alert(error instanceof Error ? error.message : 'No se pudo actualizar la vigencia del articulo.');
      } finally {
        setActualizandoVigenciaId(null);
      }
    },
    []
  );

  const gruposPorArticulo = useMemo(() => {
    const mapa = new Map<number, string[]>();
    for (const registro of articulosXGrupo) {
      const grupo = grupos.find((g) => g.id_grupo === registro.id_grupo_venta);
      if (!grupo) continue;
      const nombre = grupo.nombre_grupo ?? `Grupo ${grupo.id_grupo}`;
      const lista = mapa.get(registro.id_articulo) ?? [];
      if (!lista.includes(nombre)) lista.push(nombre);
      mapa.set(registro.id_articulo, lista);
    }
    return mapa;
  }, [articulosXGrupo, grupos]);

  const clientesPorArticulo = useMemo(() => {
    const mapa = new Map<number, string[]>();
    for (const registro of articulosXCliente) {
      const cliente = clientes.find((c) => c.id_cliente === registro.id_cliente);
      if (!cliente) continue;
      const lista = mapa.get(registro.id_articulo) ?? [];
      if (!lista.includes(cliente.nombre)) lista.push(cliente.nombre);
      mapa.set(registro.id_articulo, lista);
    }
    return mapa;
  }, [articulosXCliente, clientes]);

  const subgruposPorArticulo = useMemo(() => {
    const mapa = new Map<number, string[]>();
    for (const registro of articulosXGrupo) {
      if (registro.id_subgrupo === null) continue;
      const subgrupo = subgrupos.find((s) => s.id_subgrupo === registro.id_subgrupo);
      if (!subgrupo) continue;
      const lista = mapa.get(registro.id_articulo) ?? [];
      if (!lista.includes(subgrupo.nombre_subgrupo)) lista.push(subgrupo.nombre_subgrupo);
      mapa.set(registro.id_articulo, lista);
    }
    return mapa;
  }, [articulosXGrupo, subgrupos]);

  const formatearListaConLimite = (nombres: string[], maximo = 2) => {
    if (nombres.length === 0) return null;
    if (nombres.length <= maximo) return nombres.join(', ');
    return `${nombres.slice(0, maximo).join(', ')} +${nombres.length - maximo}`;
  };

  const columnas: ColumnaArticulo[] = useMemo(() => [
    {
      header: 'Código',
      render: (item) => (item.barcode_header ? (item.barcode_tail ? (item.barcode_header + item.barcode_tail) : item.barcode_header) 
      : item.barcode_tail ? '779000' + item.barcode_tail : 'No Asignado'),
      extraClassName: (item) => (!item.barcode_tail && !item.barcode_header ? 'text-gray-400 text-sm flex justify-center' : ''),
      campo: 'barcode',
      width: 90,
    },
    {
      header: 'Nombre',
      render: (item) => item.descripcion ?? 'Sin Nombre',
      extraClassName: (item) => (!item.descripcion ? 'text-gray-400 text-sm flex justify-center' : ''),
      campo: 'descripcion',
      width: 190,
    },
    {
      header: 'Detalle',
      render: (item) => item.detalle ?? 'Sin Detalle',
      extraClassName: (item) => (!item.detalle ? 'text-gray-400 text-sm flex justify-center' : ''),
      campo: 'detalle',
      width: 130,
    },
    {
      header: 'Grupos',
      render: (item) => formatearListaConLimite(gruposPorArticulo.get(item.id_articulo) ?? []) ?? 'Sin Grupos',
      renderCell: (item) => (
        <ListaDeChips nombres={gruposPorArticulo.get(item.id_articulo) ?? []} vacioTexto='Sin Grupos' />
      ),
      onClick: (item) => abrirEdicionGrupos(item),
      width: 120,
    },
    {
      header: 'Subgrupos',
      render: (item) => formatearListaConLimite(subgruposPorArticulo.get(item.id_articulo) ?? []) ?? 'Sin Subgrupos',
      renderCell: (item) => (
        <ListaDeChips nombres={subgruposPorArticulo.get(item.id_articulo) ?? []} vacioTexto='Sin Subgrupos' />
      ),
      onClick: (item) => abrirEdicionSubgrupos(item),
      width: 160,
    },
    {
      header: 'Colegios/Clubes',
      render: (item) => formatearListaConLimite(clientesPorArticulo.get(item.id_articulo) ?? []) ?? 'Sin Colegios/Clubes',
      renderCell: (item) => (
        <ListaDeChips nombres={clientesPorArticulo.get(item.id_articulo) ?? []} vacioTexto='Sin Colegios/Clubes' />
      ),
      onClick: (item) => abrirEdicionClientes(item),
      width: 150,
    },
    { header: 'Talle',
      render: (item) => item.talle ?? 'Sin Talle',
      extraClassName: (item) => (!item.talle ? 'text-gray-400 text-sm flex justify-center' : ''),
      campo: 'talle',
      width: 90 },
    { header: 'Cantidad', render: (item) => item.cant, campo: 'cant', width: 100 },
    { header: 'Precio', render: (item) => `${item.precio}$`, campo: 'precio', width: 100 },
    {
      header: 'C. Reservada',
      render: (item) => item.cant_reservada,
      campo: 'cant_reservada',
      width: 125,
    },
    {
      header: 'C. Minima',
      render: (item) => item.stock_minimo,
      campo: 'stock_minimo',
      width: 105,
    },
      {
        header: 'Vigente',
        render: (item) =>
          actualizandoVigenciaId === item.id_articulo
            ? 'Actualizando...'
            : item.vigente
            ? 'Vigente'
            : 'No Vigente',
        extraClassName: (item) => (item.vigente ? 'text-green-500' : 'text-red-500'),
        onClick: (item) => handleToggleVigente(item),
        width: 90,
      },
  ], [
    gruposPorArticulo,
    clientesPorArticulo,
    subgruposPorArticulo,
    actualizandoVigenciaId,
    abrirEdicionGrupos,
    abrirEdicionClientes,
    abrirEdicionSubgrupos,
    handleToggleVigente,
  ]);

  const gridTemplateColumns = `${columnas.map((c) => `${c.width}px`).join(' ')} minmax(110px, 1fr)`;

  useEffect(() => {
    fetchArticulos();
    fetchGrupos();
    fetchClientes();
    fetchSubgrupos();
    fetchArticulosXGrupo();
    fetchArticulosXCliente();
  }, []);

  const articulosFiltrados = useMemo(() => {
    let articulosFiltrados = datosBackend;

    if (grupoSeleccionado !== null) {
      const idsDelGrupo = new Set(
        articulosXGrupo
          .filter((registro) => registro.id_grupo_venta === grupoSeleccionado)
          .map((registro) => registro.id_articulo)
      );
      articulosFiltrados = articulosFiltrados.filter((articulo) =>
        idsDelGrupo.has(articulo.id_articulo)
      );
    }

    if (grupoSeleccionado !== null && subgrupoSeleccionado !== null) {
      const idsDelSubgrupo = new Set(
        articulosXGrupo
          .filter(
            (registro) =>
              registro.id_grupo_venta === grupoSeleccionado && registro.id_subgrupo === subgrupoSeleccionado
          )
          .map((registro) => registro.id_articulo)
      );
      articulosFiltrados = articulosFiltrados.filter((articulo) =>
        idsDelSubgrupo.has(articulo.id_articulo)
      );
    }

    if (clienteSeleccionado !== null) {
      const idsDelCliente = new Set(
        articulosXCliente
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

    return [...articulosFiltrados].sort((a, b) =>
      (a.talle ?? '').localeCompare(b.talle ?? '')
    );
  }, [
    datosBackend,
    articulosXGrupo,
    articulosXCliente,
    grupoSeleccionado,
    subgrupoSeleccionado,
    clienteSeleccionado,
    busqueda,
    columnas,
  ]);

  const rowVirtualizer = useVirtualizer({
    count: articulosFiltrados.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const subgruposFiltrados = useMemo(() => {
    if (grupoSeleccionado === null) return subgrupos;
    return subgrupos.filter((subgrupo) => subgrupo.id_grupo === grupoSeleccionado);
  }, [grupoSeleccionado, subgrupos]);

  // Al elegir un subgrupo se selecciona automaticamente su grupo padre.
  const handleSeleccionarSubgrupo = (idSubgrupo: number) => {
    setSubgrupoSeleccionado(idSubgrupo);
    const subgrupo = subgrupos.find((s) => s.id_subgrupo === idSubgrupo);
    if (subgrupo) {
      setGrupoSeleccionado(subgrupo.id_grupo);
    }
  };

  useEffect(() => {
    if (
      subgrupoSeleccionado !== null &&
      !subgruposFiltrados.some((subgrupo) => subgrupo.id_subgrupo === subgrupoSeleccionado)
    ) {
      setSubgrupoSeleccionado(null);
    }
  }, [subgruposFiltrados, subgrupoSeleccionado]);

  return (
    <>
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
                id: g.id_grupo,
                nombre: g.nombre_grupo ?? `Grupo ${g.id_grupo}`,
              }))}
              selectedId={grupoSeleccionado}
              onSelect={setGrupoSeleccionado}
              onClear={() => {
                setGrupoSeleccionado(null);
                setSubgrupoSeleccionado(null);
              }}
              onCrear={() => setCrearModalTipo('grupo')}
              crearLabel='Crear Grupo'
            />

            <FilterDropdown
                label='Filtrar por Subgrupo'
                textSize='xl'
                opciones={subgruposFiltrados.map((s) => ({
                  id: s.id_subgrupo,
                  nombre: s.nombre_subgrupo,
                }))}
                selectedId={subgrupoSeleccionado}
                onSelect={handleSeleccionarSubgrupo}
                onClear={() => setSubgrupoSeleccionado(null)}
                onCrear={() => setCrearModalTipo('subgrupo')}
                crearLabel='Crear Subgrupo'
            />

            <FilterDropdown
            textSize='xl'
              label='Filtrar por Colegio'
              opciones={clientes.map((c) => ({
                id: c.id_cliente,
                nombre: c.nombre,
              }))}
              selectedId={clienteSeleccionado}
              onSelect={setClienteSeleccionado}
              onClear={() => setClienteSeleccionado(null)}
              onCrear={() => setCrearModalTipo('colegio')}
              crearLabel='Crear Colegio/Club'
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

          {articulosFiltrados.length === 0 && (
            <p className='px-4 py-6 text-gray-400 italic text-center'>
              No hay articulos que coincidan con la busqueda
            </p>
          )}

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
                        onClick={
                          columna.onClick
                            ? () => columna.onClick!(item)
                            : columna.campo
                            ? () => abrirEdicionCampo(item, columna.campo!)
                            : undefined
                        }
                        className={`py-3 px-4 border-black/20 border-b flex items-center break-words group-hover:bg-amber-50 transition-color duration-100 ease-in ${
                          i > 0 ? 'border-l' : ''
                        } ${columna.campo || columna.onClick ? 'cursor-pointer hover:bg-amber-300' : ''} ${
                          columna.extraClassName ? columna.extraClassName(item) : ''
                        }`}
                      >
                        {columna.renderCell ? (
                          columna.renderCell(item)
                        ) : (
                          <span
                            style={{
                              display: '-webkit-box',
                              WebkitLineClamp: MAX_LINEAS_CELDA,
                              WebkitBoxOrient: 'vertical',
                              lineHeight: `${ALTO_LINEA}px`,
                              minWidth: 0,
                            }}
                          >
                            {busqueda ? resaltarCoincidencia(valorTexto, busqueda) : valorTexto}
                          </span>
                        )}
                      </p>
                    );
                  })}
                  <div
                    className={`py-3 border-black/20 border-l border-b group-hover:bg-amber-50 transition-color duration-100 ease-in flex flex-col items-center justify-center gap-2`}
                  >
                    <button
                      type='button'
                      onClick={() => handleImprimir(item)}
                      disabled={imprimiendoId === item.id_articulo}
                      className={`rounded border px-3 py-1 text-sm font-semibold text-white transition-color duration-100 ease-in ${
                        imprimiendoId === item.id_articulo || impresoId === item.id_articulo
                          ? 'opacity-100'
                          : 'opacity-0 group-hover:opacity-100'
                      } ${
                        impresoId === item.id_articulo
                          ? 'border-green-600 bg-green-600'
                          : 'cursor-pointer border-amber-500 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:cursor-wait disabled:bg-amber-300'
                      }`}
                    >
                      {imprimiendoId === item.id_articulo
                        ? 'Imprimiendo...'
                        : impresoId === item.id_articulo
                        ? '✓ Impreso'
                        : 'Imprimir'}
                    </button>
                    <button
                      type='button'
                      onClick={() => abrirEliminacion(item)}
                      className='rounded border opacity-0 group-hover:opacity-100 border-red-500 bg-red-500 px-3 py-1 text-sm font-semibold text-white cursor-pointer transition-color duration-100 ease-in hover:bg-red-600 active:bg-red-700'
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
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

      <EditGruposModal
        isOpen={isEditGruposOpen}
        onClose={() => setIsEditGruposOpen(false)}
        onSuccess={handleArticuloActualizado}
        articulo={articuloAEditar}
        grupos={grupos}
        articulosXGrupo={articulosXGrupo}
      />

      <EditClientesModal
        isOpen={isEditClientesOpen}
        onClose={() => setIsEditClientesOpen(false)}
        onSuccess={handleArticuloActualizado}
        articulo={articuloAEditar}
        clientes={clientes}
        articulosXCliente={articulosXCliente}
      />

      <EditSubgruposModal
        isOpen={isEditSubgruposOpen}
        onClose={() => setIsEditSubgruposOpen(false)}
        onSuccess={handleArticuloActualizado}
        articulo={articuloAEditar}
        subgrupos={subgrupos}
        articulosXGrupo={articulosXGrupo}
      />

      <EliminarArticuloModal
        isOpen={isEliminarModalOpen}
        onClose={() => setIsEliminarModalOpen(false)}
        onSuccess={handleArticuloActualizado}
        articulo={articuloAEditar}
      />

      <EditFieldModal
        isOpen={isFieldModalOpen}
        onClose={() => setIsFieldModalOpen(false)}
        onSuccess={handleArticuloActualizado}
        articulo={articuloAEditar}
        campo={campoAEditar}
      />

      <CrearAgrupacionModal
        isOpen={crearModalTipo !== null}
        onClose={() => setCrearModalTipo(null)}
        onGuardado={handleAgrupacionCreada}
        tipo={crearModalTipo ?? 'grupo'}
        grupos={grupos}
        grupoPreseleccionado={grupoSeleccionado}
      />
    </>
  );
}

export default ArticulosPage;
