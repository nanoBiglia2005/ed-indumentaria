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
  LINEAS,
} from '../../../backend/generated/prisma/client';
import CreateArticleModal from '../CreateArticleModal';
import EditGruposModal from '../EditGruposModal';
import EditClientesModal from '../EditClientesModal';
import EditSubgruposModal from '../EditSubgruposModal';
import EditLineaModal from '../EditLineaModal';
import EliminarArticuloModal from '../EliminarArticuloModal';
import EditFieldModal from '../EditFieldModal';
import type { CampoEditable } from '../EditFieldModal';
import SelectListModal from '../SelectListModal';
import CrearAgrupacionModal from '../CrearAgrupacionModal';
import type { TipoAgrupacion } from '../CrearAgrupacionModal';
import { normalizarBusqueda, resaltarCoincidencia } from '../textUtils';
import ColumnFilterModal from '../ColumnFilterModal';
import type { FiltroColumna, OpcionFiltro } from '../ColumnFilterModal';
import AccionMasivaModal from '../AccionMasivaModal';
import type { AccionMasiva } from '../AccionMasivaModal';

const SIN_ASIGNAR_ID = -1;

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

function IconoOrden({ direccion }: { direccion: 'asc' | 'desc' | null }) {
  if (direccion === 'asc') {
    return (
      <svg className='h-3.5 w-3.5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2}>
        <path strokeLinecap='round' strokeLinejoin='round' d='M12 19V5m0 0l-5 5m5-5l5 5' />
      </svg>
    );
  }
  if (direccion === 'desc') {
    return (
      <svg className='h-3.5 w-3.5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2}>
        <path strokeLinecap='round' strokeLinejoin='round' d='M12 5v14m0 0l-5-5m5 5l5-5' />
      </svg>
    );
  }
  return (
    <svg className='h-3.5 w-3.5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2}>
      <path strokeLinecap='round' strokeLinejoin='round' d='M8 9l4-4 4 4M16 15l-4 4-4-4' />
    </svg>
  );
}

type Opcion = { id: number; nombre: string };

const ALTO_LINEA = 20;
const PADDING_VERTICAL_FILA = 24;
const BORDE_FILA = 1;
const MAX_LINEAS_CELDA = 4;
const ROW_HEIGHT = MAX_LINEAS_CELDA * ALTO_LINEA + PADDING_VERTICAL_FILA + BORDE_FILA;
const ANCHO_COL_SELECCION = 44;

function FilterDropdown({
  label,
  opciones,
  selectedId,
  onSelect,
  onClear,
  disabled = false,
  onCrear,
  crearLabel,
}: {
  label: string;
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
        className={`flex items-center justify-between gap-1 sm:gap-1.5 lg:gap-2 px-2 py-1 sm:px-3 sm:py-1 lg:px-4 rounded border min-w-0 lg:min-w-[140px] font-semibold whitespace-nowrap transition-color duration-100 ease-in ${
          disabled
            ? 'cursor-not-allowed border-gray-300 text-gray-400'
            : 'cursor-pointer text-violet-500 hover:bg-amber-400 hover:text-white'
        } ${seleccionada ? 'bg-violet-500 text-white' : ''}`}
      >
        <span className='text-sm sm:text-base lg:text-xl'>{seleccionada ? seleccionada.nombre : label}</span>
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
  const [lineas, setLineas] = useState<LINEAS[]>([]);

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
  const [isEditLineaOpen, setIsEditLineaOpen] = useState(false);
  const [isEliminarModalOpen, setIsEliminarModalOpen] = useState(false);
  const [campoAEditar, setCampoAEditar] = useState<CampoEditable | null>(null);
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [imprimiendoId, setImprimiendoId] = useState<number | null>(null);
  const [impresoId, setImpresoId] = useState<number | null>(null);
  const [actualizandoVigenciaId, setActualizandoVigenciaId] = useState<number | null>(null);
  const [crearModalTipo, setCrearModalTipo] = useState<TipoAgrupacion | null>(null);
  const [filtrosColumna, setFiltrosColumna] = useState<Record<string, FiltroColumna>>({});
  const [columnaFiltroAbierta, setColumnaFiltroAbierta] = useState<string | null>(null);
  // Lista de criterios de orden ordenada por prioridad: el primero es el
  // criterio principal, los siguientes desempatan en orden.
  const [ordenColumnas, setOrdenColumnas] = useState<{ key: string; direccion: 'asc' | 'desc' }[]>([]);
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set());
  const [accionMasiva, setAccionMasiva] = useState<AccionMasiva | null>(null);
  const [actualizandoMasivo, setActualizandoMasivo] = useState(false);

  type FiltroDefTexto = { tipo: 'texto' };
  type FiltroDefRango = { tipo: 'rango'; getValor: (item: ARTICULOS) => number | null };
  type FiltroDefSeleccion = {
    tipo: 'seleccion';
    getValores: (item: ARTICULOS) => OpcionFiltro[];
    opcionesEstaticas?: OpcionFiltro[];
  };
  type FiltroDef = FiltroDefTexto | FiltroDefRango | FiltroDefSeleccion;

  type ColumnaArticulo = {
    header: string;
    render: (item: ARTICULOS) => ReactNode;
    renderCell?: (item: ARTICULOS) => ReactNode;
    extraClassName?: (item: ARTICULOS) => string;
    campo?: CampoEditable;
    onClick?: (item: ARTICULOS) => void;
    width: number;
    filtroKey: string;
    filtro: FiltroDef;
    // Si se define, se usa para ordenar en lugar del criterio por defecto
    // segun el tipo de filtro (util cuando el texto mostrado no ordena bien,
    // p.ej. codigos numericos guardados como string).
    ordenValor?: (item: ARTICULOS) => string | number | null;
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

  const fetchLineas = () => {
    fetch('/api/lineas')
      .then((respuesta) => respuesta.json())
      .then((data) => setLineas(data))
      .catch((error) => console.error('Error al obtener las lineas:', error));
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

  const abrirEdicionLinea = useCallback((articulo: ARTICULOS) => {
    setArticuloAEditar(articulo);
    setIsEditLineaOpen(true);
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

  const gruposDeArticulo = useMemo(() => {
    const mapa = new Map<number, OpcionFiltro[]>();
    for (const registro of articulosXGrupo) {
      const grupo = grupos.find((g) => g.id_grupo === registro.id_grupo_venta);
      if (!grupo) continue;
      const opcion = { id: grupo.id_grupo, nombre: grupo.nombre_grupo ?? `Grupo ${grupo.id_grupo}` };
      const lista = mapa.get(registro.id_articulo) ?? [];
      if (!lista.some((o) => o.id === opcion.id)) lista.push(opcion);
      mapa.set(registro.id_articulo, lista);
    }
    return mapa;
  }, [articulosXGrupo, grupos]);

  const clientesDeArticulo = useMemo(() => {
    const mapa = new Map<number, OpcionFiltro[]>();
    for (const registro of articulosXCliente) {
      const cliente = clientes.find((c) => c.id_cliente === registro.id_cliente);
      if (!cliente) continue;
      const opcion = { id: cliente.id_cliente, nombre: cliente.nombre };
      const lista = mapa.get(registro.id_articulo) ?? [];
      if (!lista.some((o) => o.id === opcion.id)) lista.push(opcion);
      mapa.set(registro.id_articulo, lista);
    }
    return mapa;
  }, [articulosXCliente, clientes]);

  const subgruposDeArticulo = useMemo(() => {
    const mapa = new Map<number, OpcionFiltro[]>();
    for (const registro of articulosXGrupo) {
      if (registro.id_subgrupo === null) continue;
      const subgrupo = subgrupos.find((s) => s.id_subgrupo === registro.id_subgrupo);
      if (!subgrupo) continue;
      const opcion = { id: subgrupo.id_subgrupo, nombre: subgrupo.nombre_subgrupo };
      const lista = mapa.get(registro.id_articulo) ?? [];
      if (!lista.some((o) => o.id === opcion.id)) lista.push(opcion);
      mapa.set(registro.id_articulo, lista);
    }
    return mapa;
  }, [articulosXGrupo, subgrupos]);

  const gruposPorArticulo = useMemo(() => {
    const mapa = new Map<number, string[]>();
    for (const [id, opciones] of gruposDeArticulo) mapa.set(id, opciones.map((o) => o.nombre));
    return mapa;
  }, [gruposDeArticulo]);

  const clientesPorArticulo = useMemo(() => {
    const mapa = new Map<number, string[]>();
    for (const [id, opciones] of clientesDeArticulo) mapa.set(id, opciones.map((o) => o.nombre));
    return mapa;
  }, [clientesDeArticulo]);

  const subgruposPorArticulo = useMemo(() => {
    const mapa = new Map<number, string[]>();
    for (const [id, opciones] of subgruposDeArticulo) mapa.set(id, opciones.map((o) => o.nombre));
    return mapa;
  }, [subgruposDeArticulo]);

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
      width: 120,
      filtroKey: 'codigo',
      filtro: { tipo: 'texto' },
      // El codigo se guarda como string, pero es un numero: se ordena por su
      // valor numerico para que 100 quede despues de 20 en vez de antes.
      ordenValor: (item) => {
        const codigo = item.barcode_header
          ? item.barcode_tail
            ? item.barcode_header + item.barcode_tail
            : item.barcode_header
          : item.barcode_tail
          ? '779000' + item.barcode_tail
          : null;
        if (!codigo) return null;
        const numero = Number(codigo);
        return Number.isNaN(numero) ? codigo : numero;
      },
    },
    {
      header: 'Colegios/Clubes',
      render: (item) => formatearListaConLimite(clientesPorArticulo.get(item.id_articulo) ?? []) ?? 'Sin Colegios/Clubes',
      renderCell: (item) => (
        <ListaDeChips nombres={clientesPorArticulo.get(item.id_articulo) ?? []} vacioTexto='Sin Colegios/Clubes' />
      ),
      onClick: (item) => abrirEdicionClientes(item),
      width: 175,
      filtroKey: 'colegios',
      filtro: { tipo: 'seleccion', getValores: (item) => clientesDeArticulo.get(item.id_articulo) ?? [] },
    },
    {
      header: 'Línea',
      render: (item) => lineas.find((l) => l.id_linea === item.id_linea)?.nombre_linea ?? 'Sin Línea',
      extraClassName: (item) => (item.id_linea === null ? 'text-gray-400 text-sm flex justify-center' : 'font-semibold text-[14px]'),
      onClick: (item) => abrirEdicionLinea(item),
      width: 120,
      filtroKey: 'linea',
      filtro: {
        tipo: 'seleccion',
        getValores: (item) => {
          const linea = lineas.find((l) => l.id_linea === item.id_linea);
          return linea ? [{ id: linea.id_linea, nombre: linea.nombre_linea }] : [];
        },
      },
    },
    {
      header: 'Grupos',
      render: (item) => formatearListaConLimite(gruposPorArticulo.get(item.id_articulo) ?? []) ?? 'Sin Grupos',
      renderCell: (item) => (
        <ListaDeChips nombres={gruposPorArticulo.get(item.id_articulo) ?? []} vacioTexto='Sin Grupos' />
      ),
      onClick: (item) => abrirEdicionGrupos(item),
      width: 120,
      filtroKey: 'grupos',
      filtro: { tipo: 'seleccion', getValores: (item) => gruposDeArticulo.get(item.id_articulo) ?? [] },
    },
    {
      header: 'Subgrupos',
      render: (item) => formatearListaConLimite(subgruposPorArticulo.get(item.id_articulo) ?? []) ?? 'Sin Subgrupos',
      renderCell: (item) => (
        <ListaDeChips nombres={subgruposPorArticulo.get(item.id_articulo) ?? []} vacioTexto='Sin Subgrupos' />
      ),
      onClick: (item) => abrirEdicionSubgrupos(item),
      width: 160,
      filtroKey: 'subgrupos',
      filtro: { tipo: 'seleccion', getValores: (item) => subgruposDeArticulo.get(item.id_articulo) ?? [] },
    },
    {
      header: 'Color',
      render: (item) => item.detalle ?? 'Sin Detalle',
      extraClassName: (item) => (!item.detalle ? 'text-gray-400 text-sm flex justify-center' : ''),
      campo: 'detalle',
      width: 130,
      filtroKey: 'detalle',
      filtro: { tipo: 'texto' },
    },
    {
      header: 'Detalle',
      render: (item) => item.descripcion ?? 'Sin Nombre',
      extraClassName: (item) => (!item.descripcion ? 'text-gray-400 text-sm flex justify-center' : ''),
      campo: 'descripcion',
      width: 180,
      filtroKey: 'nombre',
      filtro: { tipo: 'texto' },
    },
    { header: 'Talle',
      render: (item) => item.talle ?? 'Sin Talle',
      extraClassName: (item) => (!item.talle ? 'text-gray-400 text-sm flex justify-center' : ''),
      campo: 'talle',
      width: 105,
      filtroKey: 'talle',
      filtro: { tipo: 'texto' } },
    {
      header: 'Cantidad',
      render: (item) => item.cant,
      campo: 'cant',
      width: 130,
      filtroKey: 'cant',
      filtro: { tipo: 'rango', getValor: (item) => item.cant },
    },
    {
      header: 'Precio Unitario',
      render: (item) => `${item.precio}$`,
      campo: 'precio',
      width: 170,
      filtroKey: 'precio',
      filtro: { tipo: 'rango', getValor: (item) => item.precio },
    },
    {
      header: 'C. Reservada',
      render: (item) => item.cant_reservada,
      campo: 'cant_reservada',
      width: 155,
      filtroKey: 'cant_reservada',
      filtro: { tipo: 'rango', getValor: (item) => item.cant_reservada ?? 0 },
    },
    {
      header: 'C. Minima',
      render: (item) => item.stock_minimo,
      campo: 'stock_minimo',
      width: 140,
      filtroKey: 'stock_minimo',
      filtro: { tipo: 'rango', getValor: (item) => item.stock_minimo },
    },
      {
        header: 'Vigente',
        render: (item) => item.vigente ? 'Vigente' : 'No Vigente',
        extraClassName: (item) => ((item.vigente ? 'text-green-500' : 'text-red-500') + ' text-[15px] flex items-center justify-center'),
        onClick: (item) => handleToggleVigente(item),
        width: 120,
        filtroKey: 'vigente',
        filtro: {
          tipo: 'seleccion',
          getValores: (item) => [{ id: item.vigente ? 1 : 0, nombre: item.vigente ? 'Vigente' : 'No Vigente' }],
          opcionesEstaticas: [
            { id: 1, nombre: 'Vigente' },
            { id: 0, nombre: 'No Vigente' },
          ],
        },
      },
  ], [
    gruposPorArticulo,
    clientesPorArticulo,
    subgruposPorArticulo,
    gruposDeArticulo,
    clientesDeArticulo,
    subgruposDeArticulo,
    lineas,
    actualizandoVigenciaId,
    abrirEdicionGrupos,
    abrirEdicionClientes,
    abrirEdicionSubgrupos,
    abrirEdicionLinea,
    handleToggleVigente,
  ]);

  const gridTemplateColumns = `${ANCHO_COL_SELECCION}px ${columnas.map((c) => `${c.width}px`).join(' ')} minmax(110px, 1fr)`;

  useEffect(() => {
    fetchArticulos();
    fetchGrupos();
    fetchClientes();
    fetchSubgrupos();
    fetchLineas();
    fetchArticulosXGrupo();
    fetchArticulosXCliente();
  }, []);

  const articulosBase = useMemo(() => {
    let resultado = datosBackend;

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
              registro.id_grupo_venta === grupoSeleccionado && registro.id_subgrupo === subgrupoSeleccionado
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

    if (busqueda !== '') {
      const termino = normalizarBusqueda(busqueda);
      resultado = resultado.filter((articulo) =>
        columnas.some((columna) => normalizarBusqueda(String(columna.render(articulo) ?? '')).includes(termino))
      );
    }

    return resultado;
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

  const coincideFiltroColumna = (articulo: ARTICULOS, columna: ColumnaArticulo, filtro: FiltroColumna): boolean => {
    if (columna.filtro.tipo === 'texto' && filtro.tipo === 'texto') {
      const termino = normalizarBusqueda(filtro.valor.trim());
      if (termino === '') return true;
      return normalizarBusqueda(String(columna.render(articulo) ?? '')).includes(termino);
    }

    if (columna.filtro.tipo === 'rango' && filtro.tipo === 'rango') {
      const valor = columna.filtro.getValor(articulo);
      if (valor === null) return false;
      if (filtro.desde !== null && valor < filtro.desde) return false;
      if (filtro.hasta !== null && valor > filtro.hasta) return false;
      return true;
    }

    if (columna.filtro.tipo === 'seleccion' && filtro.tipo === 'seleccion') {
      const valores = columna.filtro.getValores(articulo);
      if (valores.length === 0) return filtro.ids.includes(SIN_ASIGNAR_ID);
      return valores.some((valor) => filtro.ids.includes(valor.id));
    }

    return true;
  };

  const aplicarFiltrosColumna = (lista: ARTICULOS[], excluirFiltroKey?: string) => {
    const entradas = Object.entries(filtrosColumna).filter(([key]) => key !== excluirFiltroKey);
    if (entradas.length === 0) return lista;

    return lista.filter((articulo) =>
      entradas.every(([key, filtro]) => {
        const columna = columnas.find((c) => c.filtroKey === key);
        if (!columna) return true;
        return coincideFiltroColumna(articulo, columna, filtro);
      })
    );
  };

  const valorOrdenable = (
    item: ARTICULOS,
    columna: ColumnaArticulo
  ): { vacio: boolean; valor: string | number } => {
    if (columna.ordenValor) {
      const valor = columna.ordenValor(item);
      return valor === null || valor === '' ? { vacio: true, valor: 0 } : { vacio: false, valor };
    }

    if (columna.filtro.tipo === 'rango') {
      const valor = columna.filtro.getValor(item);
      return valor === null ? { vacio: true, valor: 0 } : { vacio: false, valor };
    }

    if (columna.filtro.tipo === 'seleccion') {
      const nombre = columna.filtro.getValores(item)[0]?.nombre;
      return nombre ? { vacio: false, valor: nombre } : { vacio: true, valor: '' };
    }

    const valor = String(columna.render(item) ?? '');
    return { vacio: valor.trim() === '', valor };
  };

  const articulosFiltrados = useMemo(() => {
    const resultado = aplicarFiltrosColumna(articulosBase);

    // Resuelve cada criterio de orden a su columna una sola vez, en el mismo
    // orden de prioridad en que fueron agregados.
    const criterios = ordenColumnas
      .map((criterio) => {
        const columna = columnas.find((c) => c.filtroKey === criterio.key);
        return columna ? { columna, direccion: criterio.direccion } : null;
      })
      .filter((c): c is { columna: ColumnaArticulo; direccion: 'asc' | 'desc' } => c !== null);

    return [...resultado].sort((a, b) => {
      for (const { columna, direccion } of criterios) {
        const { vacio: vacioA, valor: valorA } = valorOrdenable(a, columna);
        const { vacio: vacioB, valor: valorB } = valorOrdenable(b, columna);
        if (vacioA && vacioB) continue;
        if (vacioA) return 1;
        if (vacioB) return -1;
        const comparacion =
          typeof valorA === 'number' && typeof valorB === 'number'
            ? valorA - valorB
            : String(valorA).localeCompare(String(valorB));
        if (comparacion !== 0) return direccion === 'asc' ? comparacion : -comparacion;
      }
      return (a.talle ?? '').localeCompare(b.talle ?? '');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articulosBase, filtrosColumna, columnas, ordenColumnas]);

  // El "estado de seleccion" existe mientras haya al menos un articulo
  // seleccionado; al deseleccionar el ultimo la tabla vuelve a su estado normal.
  const modoSeleccion = seleccionados.size > 0;

  // Si un articulo seleccionado deja de existir (p.ej. fue eliminado),
  // se lo quita de la seleccion.
  useEffect(() => {
    setSeleccionados((prev) => {
      if (prev.size === 0) return prev;
      const idsExistentes = new Set(datosBackend.map((a) => a.id_articulo));
      const siguiente = new Set([...prev].filter((id) => idsExistentes.has(id)));
      return siguiente.size === prev.size ? prev : siguiente;
    });
  }, [datosBackend]);

  const toggleSeleccion = (id: number) => {
    setSeleccionados((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(id)) {
        siguiente.delete(id);
      } else {
        siguiente.add(id);
      }
      return siguiente;
    });
  };

  const todosSeleccionados =
    articulosFiltrados.length > 0 && articulosFiltrados.every((a) => seleccionados.has(a.id_articulo));

  // Checkbox del header: selecciona todos los articulos visibles en la lista
  // actual; si ya estan todos seleccionados, los deselecciona.
  const handleSeleccionarTodos = () => {
    setSeleccionados((prev) => {
      const siguiente = new Set(prev);
      if (todosSeleccionados) {
        for (const articulo of articulosFiltrados) siguiente.delete(articulo.id_articulo);
      } else {
        for (const articulo of articulosFiltrados) siguiente.add(articulo.id_articulo);
      }
      return siguiente;
    });
  };

  const handleVigenciaMasiva = async (vigente: boolean) => {
    if (actualizandoMasivo) return;
    setActualizandoMasivo(true);
    try {
      const resultados = await Promise.allSettled(
        [...seleccionados].map((id) =>
          fetch(`/api/articulos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vigente }),
          }).then(async (respuesta) => {
            if (!respuesta.ok) {
              const errorData = await respuesta.json().catch(() => ({}));
              throw new Error(errorData.details || errorData.message);
            }
          })
        )
      );
      const fallidos = resultados.filter((r) => r.status === 'rejected').length;
      if (fallidos > 0) {
        alert(`No se pudo actualizar la vigencia de ${fallidos} de ${resultados.length} articulos.`);
      }
      fetchArticulos();
    } finally {
      setActualizandoMasivo(false);
    }
  };

  // Ejecuta la accion confirmada en el modal (eliminar o imprimir todos los
  // seleccionados). Si algo falla, lanza para que el modal muestre el error.
  const ejecutarAccionMasiva = async () => {
    const ids = [...seleccionados];

    if (accionMasiva === 'eliminar') {
      const resultados = await Promise.allSettled(
        ids.map((id) =>
          fetch(`/api/articulos/${id}`, { method: 'DELETE' }).then(async (respuesta) => {
            if (!respuesta.ok) {
              const errorData = await respuesta.json().catch(() => ({}));
              throw new Error(errorData.message || errorData.details);
            }
          })
        )
      );
      handleArticuloActualizado();
      const fallidos = resultados.filter((r) => r.status === 'rejected').length;
      if (fallidos > 0) {
        throw new Error(`No se pudieron eliminar ${fallidos} de ${ids.length} articulos.`);
      }
      return;
    }

    if (accionMasiva === 'imprimir') {
      // Secuencial para no saturar el servicio de impresion.
      let fallidos = 0;
      for (const id of ids) {
        try {
          const respuesta = await fetch('/api/print', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_articulo: id, cantidad: 1 }),
          });
          const resultado = await respuesta.json();
          if (!respuesta.ok || resultado.status === 'error') fallidos++;
        } catch {
          fallidos++;
        }
      }
      if (fallidos > 0) {
        throw new Error(`No se pudieron imprimir ${fallidos} de ${ids.length} articulos.`);
      }
    }
  };

  const columnaConFiltroAbierto = columnas.find((c) => c.filtroKey === columnaFiltroAbierta) ?? null;

  const opcionesFiltroAbierto = useMemo(() => {
    if (!columnaConFiltroAbierto || columnaConFiltroAbierto.filtro.tipo !== 'seleccion') return [];
    const filtroDef = columnaConFiltroAbierto.filtro;
    if (filtroDef.opcionesEstaticas) return filtroDef.opcionesEstaticas;

    const listaVisible = aplicarFiltrosColumna(articulosBase, columnaConFiltroAbierto.filtroKey);
    const mapa = new Map<number, OpcionFiltro>();
    let haySinAsignar = false;

    for (const articulo of listaVisible) {
      const valores = filtroDef.getValores(articulo);
      if (valores.length === 0) {
        haySinAsignar = true;
        continue;
      }
      for (const valor of valores) {
        if (!mapa.has(valor.id)) mapa.set(valor.id, valor);
      }
    }

    const opciones = [...mapa.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
    if (haySinAsignar) opciones.push({ id: SIN_ASIGNAR_ID, nombre: 'Sin asignar' });
    return opciones;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnaConFiltroAbierto, articulosBase, filtrosColumna, columnas]);

  const handleClickHeader = (columna: ColumnaArticulo) => {
    if (filtrosColumna[columna.filtroKey]) {
      setFiltrosColumna((prev) => {
        const siguiente = { ...prev };
        delete siguiente[columna.filtroKey];
        return siguiente;
      });
      return;
    }
    setColumnaFiltroAbierta(columna.filtroKey);
  };

  // Click normal: apila la columna como un criterio mas de orden (o cicla su
  // direccion / la quita si ya estaba). Shift+click: la vuelve el unico
  // criterio de orden, descartando los demas.
  const handleClickOrdenar = (columna: ColumnaArticulo, event: React.MouseEvent) => {
    setOrdenColumnas((prev) => {
      const indice = prev.findIndex((c) => c.key === columna.filtroKey);

      if (event.shiftKey) {
        if (indice === -1 || prev.length > 1) return [{ key: columna.filtroKey, direccion: 'asc' }];
        if (prev[indice].direccion === 'asc') return [{ key: columna.filtroKey, direccion: 'desc' }];
        return [];
      }

      if (indice === -1) return [...prev, { key: columna.filtroKey, direccion: 'asc' }];
      if (prev[indice].direccion === 'asc') {
        const siguiente = [...prev];
        siguiente[indice] = { key: columna.filtroKey, direccion: 'desc' };
        return siguiente;
      }
      return prev.filter((c) => c.key !== columna.filtroKey);
    });
  };

  const handleAplicarFiltroColumna = (filtro: FiltroColumna | null) => {
    if (!columnaConFiltroAbierto) return;
    const key = columnaConFiltroAbierto.filtroKey;
    setFiltrosColumna((prev) => {
      const siguiente = { ...prev };
      if (filtro === null) {
        delete siguiente[key];
      } else {
        siguiente[key] = filtro;
      }
      return siguiente;
    });
  };

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
        <div className='flex flex-wrap gap-y-2 justify-between my-2'>
          <div className='flex flex-wrap gap-1.5 sm:gap-2 lg:gap-4 select-none'>
          <button
            onClick={() => setIsModalOpen(true)}
            className='rounded flex items-center py-1 px-2 sm:py-1.5 sm:px-2.5 lg:py-2 lg:px-3 text-white font-semibold text-sm sm:text-base lg:text-lg border cursor-pointer bg-violet-500 whitespace-nowrap transition-color
            duration-100 ease-in'
          >
            <span>Nuevo Articulo</span>
          </button>
          <div className='flex flex-wrap items-center gap-1.5 sm:gap-2'>
            <FilterDropdown
              label='Filtrar por Grupo'
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
              label='Filtrar por Colegio/Club'
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
          </div>     
          <div className='relative w-72 flex items-center py-2'>
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
            <span className={`py-3 border-black/35 bg-stone-100 border-b flex items-center justify-center ${modoSeleccion ? 'bg-violet-500' : ''}`}>
              <input
                type='checkbox'
                checked={todosSeleccionados}
                onChange={handleSeleccionarTodos}
                title={todosSeleccionados ? 'Deseleccionar todos' : 'Seleccionar todos'}
                className='h-4 w-4 accent-violet-300 cursor-pointer'
              />
            </span>
            {modoSeleccion ? (
              <div
                className='border-black/35 bg-violet-500 border-b border-l overflow-hidden'
                style={{ gridColumn: '2 / -1' }}
              >
                <div className='sticky w-fit flex items-center gap-2 px-3 py-2'>
                  <span className='text-white text-[13px] font-semibold whitespace-nowrap pr-1'>
                    {seleccionados.size} {seleccionados.size === 1 ? 'seleccionado' : 'seleccionados'}
                  </span>
                  <button
                    type='button'
                    onClick={() => setSeleccionados(new Set())}
                    disabled={actualizandoMasivo}
                    className='rounded border border-white/70 px-3 py-1 text-[13px] font-semibold text-white cursor-pointer transition-colors duration-100 ease-in hover:bg-violet-600 disabled:opacity-50 disabled:cursor-wait whitespace-nowrap'
                  >
                    Deseleccionar
                  </button>
                  <button
                    type='button'
                    onClick={() => handleVigenciaMasiva(true)}
                    disabled={actualizandoMasivo}
                    className='rounded border border-green-600 bg-green-600 px-3 py-1 text-[13px] font-semibold text-white cursor-pointer transition-colors duration-100 ease-in hover:bg-green-700 disabled:opacity-50 disabled:cursor-wait whitespace-nowrap'
                  >
                    {actualizandoMasivo ? 'Actualizando...' : 'Establecer Vigente'}
                  </button>
                  <button
                    type='button'
                    onClick={() => handleVigenciaMasiva(false)}
                    disabled={actualizandoMasivo}
                    className='rounded border border-orange-500 bg-orange-500 px-3 py-1 text-[13px] font-semibold text-white cursor-pointer transition-colors duration-100 ease-in hover:bg-orange-600 disabled:opacity-50 disabled:cursor-wait whitespace-nowrap'
                  >
                    {actualizandoMasivo ? 'Actualizando...' : 'Establecer No Vigente'}
                  </button>
                  <button
                    type='button'
                    onClick={() => setAccionMasiva('imprimir')}
                    disabled={actualizandoMasivo}
                    className='rounded border border-amber-500 bg-amber-500 px-3 py-1 text-[13px] font-semibold text-white cursor-pointer transition-colors duration-100 ease-in hover:bg-amber-600 disabled:opacity-50 disabled:cursor-wait whitespace-nowrap'
                  >
                    Imprimir
                  </button>
                  <button
                    type='button'
                    onClick={() => setAccionMasiva('eliminar')}
                    disabled={actualizandoMasivo}
                    className='rounded border border-red-500 bg-red-500 px-3 py-1 text-[13px] font-semibold text-white cursor-pointer transition-colors duration-100 ease-in hover:bg-red-600 disabled:opacity-50 disabled:cursor-wait whitespace-nowrap'
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ) : (
              <>
            {columnas.map((columna) => {
              const filtroActivo = filtrosColumna[columna.filtroKey];
              const prioridadOrden = ordenColumnas.findIndex((c) => c.key === columna.filtroKey);
              const ordenActivo = prioridadOrden === -1 ? null : ordenColumnas[prioridadOrden].direccion;
              return (
                <div
                  key={columna.header}
                  className={`flex items-stretch border-black/35 text-[13px] font-medium border-b border-l transition-colors duration-100 ease-in ${
                    filtroActivo ? 'bg-violet-500 text-white' : 'bg-stone-100'
                  }`}
                >
                  <button
                    type='button'
                    onClick={() => handleClickHeader(columna)}
                    title={filtroActivo ? `Quitar filtro de ${columna.header}` : `Filtrar por ${columna.header}`}
                    className={`flex-1 min-w-0 py-3 pl-4 pr-1.5 flex items-center gap-1.5 cursor-pointer transition-colors duration-100 ease-in text-left ${
                      filtroActivo ? 'hover:bg-violet-600' : 'hover:bg-amber-100'
                    }`}
                  >
                    <span className='flex-1 truncate'>{columna.header}</span>
                    <svg
                      className={`h-3.5 w-3.5 shrink-0 ${filtroActivo ? 'text-white' : 'text-gray-400'}`}
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        d='M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z'
                      />
                    </svg>
                  </button>
                  <button
                    type='button'
                    onClick={(e) => handleClickOrdenar(columna, e)}
                    title={
                      ordenActivo === 'asc'
                        ? 'Orden ascendente. Click: invertir. Shift+click: usar solo esta columna.'
                        : ordenActivo === 'desc'
                        ? 'Orden descendente. Click: quitar. Shift+click: usar solo esta columna.'
                        : `Ordenar por ${columna.header}. Shift+click: usar solo esta columna.`
                    }
                    className={`shrink-0 py-3 pl-2 pr-1 flex items-center gap-0.5 cursor-pointer transition-colors duration-100 ease-in ${
                      filtroActivo ? 'hover:bg-violet-600' : 'hover:bg-amber-100'
                    } ${
                      ordenActivo
                        ? filtroActivo
                          ? 'text-white'
                          : 'text-violet-600'
                        : filtroActivo
                        ? 'text-white/70'
                        : 'text-gray-400'
                    }`}
                  >
                    <IconoOrden direccion={ordenActivo} />
                    {ordenColumnas.length > 1 && prioridadOrden !== -1 && (
                      <span className='text-[10px] font-bold leading-none w-3 text-center'>
                        {prioridadOrden + 1}
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
            <span className='py-3 px-4 border-black/35 bg-stone-100 border-b border-l text-[13px] font-medium flex items-center justify-center'>
              Acción
            </span>
              </>
            )}
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
                  className='grid text-black text-[13px] group absolute top-0 left-0 w-full'
                  style={{
                    gridTemplateColumns,
                    height: ROW_HEIGHT,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <label
                    className={`py-3 border-black/20 border-b flex items-center justify-center cursor-pointer group-hover:bg-amber-50 transition-color duration-100 ease-in ${
                      seleccionados.has(item.id_articulo) ? 'bg-amber-100' : ''
                    }`}
                  >
                    <input
                      type='checkbox'
                      checked={seleccionados.has(item.id_articulo)}
                      onChange={() => toggleSeleccion(item.id_articulo)}
                      className='h-4 w-4 accent-violet-600 cursor-pointer'
                    />
                  </label>
                  {columnas.map((columna) => {
                    const valorTexto = String(columna.render(item) ?? '');
                    const filtroTextoColumna = filtrosColumna[columna.filtroKey];
                    const terminoResaltado =
                      filtroTextoColumna?.tipo === 'texto' && filtroTextoColumna.valor.trim() !== ''
                        ? filtroTextoColumna.valor.trim()
                        : busqueda;
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
                        className={`py-3 px-4 border-black/20 border-b border-l flex items-center break-words group-hover:bg-amber-50 transition-color duration-100 ease-in ${
                          seleccionados.has(item.id_articulo) ? 'bg-amber-100' : ''
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
                            {resaltarCoincidencia(valorTexto, terminoResaltado)}
                          </span>
                        )}
                      </p>
                    );
                  })}
                  <div
                    className={`py-3 border-black/20 border-l border-b group-hover:bg-amber-50 transition-color duration-100 ease-in flex flex-col items-center justify-center gap-2 ${
                      seleccionados.has(item.id_articulo) ? 'bg-violet-50' : ''
                    }`}
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
        grupos={grupos}
        subgrupos={subgrupos}
        articulosXGrupo={articulosXGrupo}
      />

      <EditLineaModal
        isOpen={isEditLineaOpen}
        onClose={() => setIsEditLineaOpen(false)}
        onSuccess={handleArticuloActualizado}
        articulo={articuloAEditar}
        lineas={lineas}
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

      <AccionMasivaModal
        isOpen={accionMasiva !== null}
        onClose={() => setAccionMasiva(null)}
        accion={accionMasiva}
        cantidad={seleccionados.size}
        onConfirmar={ejecutarAccionMasiva}
      />

      <ColumnFilterModal
        isOpen={columnaConFiltroAbierto !== null}
        onClose={() => setColumnaFiltroAbierta(null)}
        titulo={columnaConFiltroAbierto?.header ?? ''}
        tipo={columnaConFiltroAbierto?.filtro.tipo ?? null}
        filtroActual={columnaConFiltroAbierto ? filtrosColumna[columnaConFiltroAbierto.filtroKey] : undefined}
        opciones={opcionesFiltroAbierto}
        onAplicar={handleAplicarFiltroColumna}
      />
    </>
  );
}

export default ArticulosPage;
