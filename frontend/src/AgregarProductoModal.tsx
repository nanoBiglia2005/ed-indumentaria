import { useEffect, useMemo, useRef, useState, Fragment } from 'react';
import type { ReactNode } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { ARTICULOS, GRUPOS_DE_VENTA, LINEAS, SUBGRUPOS_DE_VENTA } from '../../backend/generated/prisma/client';
import ColumnFilterModal from './ColumnFilterModal';
import type { FiltroColumna, OpcionFiltro } from './ColumnFilterModal';
import ConfirmarProductoModal from './ConfirmarProductoModal';
import type { ItemAConfirmar } from './ConfirmarProductoModal';
import InlineFilterDropdown from './InlineFilterDropdown';
import { normalizarBusqueda, resaltarCoincidencia } from './textUtils';

const ALTO_LINEA = 18;
const PADDING_VERTICAL_FILA = 16;
const BORDE_FILA = 1;
const MAX_LINEAS_CELDA = 3;
const ROW_HEIGHT = MAX_LINEAS_CELDA * ALTO_LINEA + PADDING_VERTICAL_FILA + BORDE_FILA;
const ANCHO_COL_SELECCION = 44;

const SIN_ASIGNAR_ID = -1;

/** Un cliente (colegio o club) tal como lo devuelve /api/venta/agrupaciones. */
type ClienteVenta = { id_cliente: number; nombre: string };
type Agrupacion = { id_grupo: number; nombre_grupo: string; clientes: ClienteVenta[] };

/** Articulo con el subgrupo que tiene DENTRO del grupo elegido. */
export type ArticuloDeVenta = ARTICULOS & {
  id_subgrupo: number | null;
  nombre_subgrupo: string | null;
};

type FiltroDefTexto = { tipo: 'texto' };
type FiltroDefRango = { tipo: 'rango'; getValor: (item: ArticuloDeVenta) => number | null };
type FiltroDefSeleccion = {
  tipo: 'seleccion';
  getValores: (item: ArticuloDeVenta) => OpcionFiltro[];
};
type FiltroDef = FiltroDefTexto | FiltroDefRango | FiltroDefSeleccion;

type ColumnaArticulo = {
  header: string;
  render: (item: ArticuloDeVenta) => ReactNode;
  extraClassName?: (item: ArticuloDeVenta) => string;
  width: number;
  filtroKey: string;
  filtro: FiltroDef;
  ordenValor?: (item: ArticuloDeVenta) => string | number | null;
};

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

const codigoDe = (item: ArticuloDeVenta) =>
  item.barcode_header
    ? item.barcode_tail
      ? item.barcode_header + item.barcode_tail
      : item.barcode_header
    : item.barcode_tail
    ? '779000' + item.barcode_tail
    : null;

// Lista de clientes de una agrupacion (paso 1), con su propio buscador: cada
// columna (Colegios, Clubes, ...) filtra de forma independiente.
function ListaClientesAgrupacion({
  agrupacion,
  onSeleccionar,
}: {
  agrupacion: Agrupacion;
  onSeleccionar: (cliente: ClienteVenta) => void;
}) {
  const [busqueda, setBusqueda] = useState('');

  const clientesFiltrados = useMemo(() => {
    if (busqueda.trim() === '') return agrupacion.clientes;
    const termino = normalizarBusqueda(busqueda);
    return agrupacion.clientes.filter((c) => normalizarBusqueda(c.nombre).includes(termino));
  }, [agrupacion.clientes, busqueda]);

  return (
    <div className='border border-gray-200 rounded-md overflow-hidden flex flex-col'>
      <div className='px-3 py-2 bg-stone-100 border-b border-gray-200 text-sm font-semibold text-gray-700'>
        {agrupacion.nombre_grupo}
      </div>
      <div className='p-2 border-b border-gray-100'>
        <input
          type='text'
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder={`Buscar en ${agrupacion.nombre_grupo}...`}
          className='w-full rounded border border-gray-300 bg-white py-1 px-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30'
        />
      </div>
      <ul className='max-h-72 overflow-y-auto divide-y divide-gray-100'>
        {clientesFiltrados.length === 0 ? (
          <li className='px-3 py-2 text-sm text-gray-400 italic'>Sin resultados</li>
        ) : (
          clientesFiltrados.map((c) => (
            <li
              key={c.id_cliente}
              onClick={() => onSeleccionar(c)}
              className='px-3 py-2 text-sm text-gray-700 cursor-pointer hover:bg-amber-50 transition-colors duration-100 ease-in'
            >
              {c.nombre}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

interface AgregarProductoModalProps {
  isOpen: boolean;
  onClose: () => void;
  articulosExcluidos: number[];
  onAgregar: (articulo: ARTICULOS, cantidad: number) => void;
}

// Convierte un talle a numero cuando se puede: "1" < "2" < "22" en vez del
// orden alfabetico ("1" < "2" < "22" para vos, pero "10" < "2" para un string).
// No todos los talles son numericos (S, M, L, ...), asi que se conserva el
// string cuando no se puede convertir.
function valorOrdenTalle(talle: string | null): string | number | null {
  if (!talle) return null;
  const recortado = talle.trim();
  if (recortado === '') return null;
  const numero = Number(recortado);
  return Number.isNaN(numero) ? recortado : numero;
}

export default function AgregarProductoModal({
  isOpen,
  onClose,
  articulosExcluidos,
  onAgregar,
}: AgregarProductoModalProps) {
  // --- Seleccion del asistente ---
  const [cliente, setCliente] = useState<ClienteVenta | null>(null);
  const [grupo, setGrupo] = useState<GRUPOS_DE_VENTA | null>(null);

  // --- Datos de cada paso ---
  const [agrupaciones, setAgrupaciones] = useState<Agrupacion[]>([]);
  const [grupos, setGrupos] = useState<GRUPOS_DE_VENTA[]>([]);
  const [articulos, setArticulos] = useState<ArticuloDeVenta[]>([]);
  const [subgrupos, setSubgrupos] = useState<SUBGRUPOS_DE_VENTA[]>([]);
  const [lineas, setLineas] = useState<LINEAS[]>([]);

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Filtros del paso 3 ---
  const [subgrupoSeleccionado, setSubgrupoSeleccionado] = useState<number | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtrosColumna, setFiltrosColumna] = useState<Record<string, FiltroColumna>>({});
  const [columnaFiltroAbierta, setColumnaFiltroAbierta] = useState<string | null>(null);
  const [ordenColumnas, setOrdenColumnas] = useState<{ key: string; direccion: 'asc' | 'desc' }[]>([]);

  // --- Busqueda de las listas de los pasos 1 y 2 ---
  const [busquedaGrupos, setBusquedaGrupos] = useState('');

  // --- Seleccion masiva (misma logica que en ArticulosPage) ---
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set());

  // --- Confirmacion (click en una fila, su boton "Agregar", o el "Agregar"
  // masivo de la barra de seleccion). Soporta uno o varios productos a la vez.
  const [productosAConfirmar, setProductosAConfirmar] = useState<ArticuloDeVenta[] | null>(null);
  // Si la tanda a confirmar vino de la seleccion masiva: al confirmar hay que
  // limpiar esa seleccion. Si vino de un click individual, no hay que tocarla
  // (podria haber otros articulos seleccionados de fondo).
  const [confirmacionEsMasiva, setConfirmacionEsMasiva] = useState(false);
  const [notificacion, setNotificacion] = useState<string | null>(null);

  const scrollParentRef = useRef<HTMLDivElement>(null);
  const notificacionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mostrarNotificacion = (mensaje: string) => {
    if (notificacionTimeoutRef.current) clearTimeout(notificacionTimeoutRef.current);
    setNotificacion(mensaje);
    notificacionTimeoutRef.current = setTimeout(() => setNotificacion(null), 2500);
  };

  useEffect(() => {
    return () => {
      if (notificacionTimeoutRef.current) clearTimeout(notificacionTimeoutRef.current);
    };
  }, []);

  const paso = cliente === null ? 1 : grupo === null ? 2 : 3;

  const volverAPaso = (destino: 1 | 2) => {
    setError(null);
    setGrupo(null);
    if (destino === 1) setCliente(null);
  };

  // Al abrirse arranca de cero y trae las agrupaciones y las lineas (tablas chicas).
  useEffect(() => {
    if (!isOpen) return;

    setCliente(null);
    setGrupo(null);
    setError(null);
    setCargando(true);
    setSeleccionados(new Set());
    setNotificacion(null);

    Promise.all([
      fetch('/api/venta/agrupaciones').then((r) => {
        if (!r.ok) throw new Error('No se pudieron obtener los colegios y clubes.');
        return r.json();
      }),
      fetch('/api/lineas').then((r) => {
        if (!r.ok) throw new Error('No se pudieron obtener las líneas.');
        return r.json();
      }),
    ])
      .then(([agrupacionesData, lineasData]) => {
        setAgrupaciones(agrupacionesData);
        setLineas(lineasData);
      })
      .catch((err) => {
        console.error('Error al obtener las agrupaciones:', err);
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los datos.');
      })
      .finally(() => setCargando(false));
  }, [isOpen]);

  // Paso 2: grupos que tienen articulos de este cliente.
  useEffect(() => {
    if (cliente === null) return;

    let cancelado = false;
    setCargando(true);
    setBusquedaGrupos('');

    fetch(`/api/venta/grupos?id_cliente=${cliente.id_cliente}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.details || data.message);
        return data as GRUPOS_DE_VENTA[];
      })
      .then((data) => {
        if (cancelado) return;
        setGrupos(data);
        setError(null);
      })
      .catch((err) => {
        if (cancelado) return;
        console.error('Error al obtener los grupos:', err);
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los grupos.');
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [cliente]);

  // Paso 3: solo los articulos que estan en el cliente Y en el grupo.
  useEffect(() => {
    if (cliente === null || grupo === null) return;

    let cancelado = false;
    setCargando(true);
    setSubgrupoSeleccionado(null);
    setBusqueda('');
    setFiltrosColumna({});
    setOrdenColumnas([]);
    setSeleccionados(new Set());

    fetch(`/api/venta/articulos?id_cliente=${cliente.id_cliente}&id_grupo=${grupo.id_grupo}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.details || data.message);
        return data as { articulos: ArticuloDeVenta[]; subgrupos: SUBGRUPOS_DE_VENTA[] };
      })
      .then((data) => {
        if (cancelado) return;
        setArticulos(data.articulos);
        setSubgrupos(data.subgrupos);
        setError(null);
      })
      .catch((err) => {
        if (cancelado) return;
        console.error('Error al obtener los articulos:', err);
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los artículos.');
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [cliente, grupo]);

  const gruposFiltrados = useMemo(() => {
    if (busquedaGrupos.trim() === '') return grupos;
    const termino = normalizarBusqueda(busquedaGrupos);
    return grupos.filter((g) => normalizarBusqueda(g.nombre_grupo).includes(termino));
  }, [grupos, busquedaGrupos]);

  const columnas: ColumnaArticulo[] = useMemo(
    () => [
      {
        header: 'Código',
        render: (item) => codigoDe(item) ?? 'No Asignado',
        extraClassName: (item) => (!codigoDe(item) ? 'text-gray-400 text-xs' : ''),
        width: 120,
        filtroKey: 'codigo',
        filtro: { tipo: 'texto' },
        // El codigo se guarda como string pero es un numero: se ordena por su
        // valor numerico para que 100 quede despues de 20 y no antes.
        ordenValor: (item) => {
          const codigo = codigoDe(item);
          if (!codigo) return null;
          const numero = Number(codigo);
          return Number.isNaN(numero) ? codigo : numero;
        },
      },
      {
        header: 'Línea',
        render: (item) => lineas.find((l) => l.id_linea === item.id_linea)?.nombre_linea ?? 'Sin Línea',
        extraClassName: (item) => (item.id_linea === null ? 'text-gray-400 text-xs' : ''),
        width: 110,
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
        header: 'Subgrupo',
        render: (item) => item.nombre_subgrupo ?? 'Sin Subgrupo',
        extraClassName: (item) => (!item.nombre_subgrupo ? 'text-gray-400 text-xs' : ''),
        width: 150,
        filtroKey: 'subgrupo',
        filtro: {
          tipo: 'seleccion',
          getValores: (item) =>
            item.id_subgrupo !== null && item.nombre_subgrupo
              ? [{ id: item.id_subgrupo, nombre: item.nombre_subgrupo }]
              : [],
        },
      },
      {
        header: 'Color/Modelo',
        render: (item) => item.detalle ?? 'Sin Detalle',
        extraClassName: (item) => (!item.detalle ? 'text-gray-400 text-xs' : ''),
        width: 150,
        filtroKey: 'detalle',
        filtro: { tipo: 'texto' },
      },
      {
        header: 'Detalle',
        render: (item) => item.descripcion ?? 'Sin Nombre',
        extraClassName: (item) => (!item.descripcion ? 'text-gray-400 text-xs' : ''),
        width: 200,
        filtroKey: 'nombre',
        filtro: { tipo: 'texto' },
      },
      {
        header: 'Talle',
        render: (item) => item.talle ?? 'Sin Talle',
        extraClassName: (item) => (!item.talle ? 'text-gray-400 text-xs' : ''),
        width: 90,
        filtroKey: 'talle',
        filtro: { tipo: 'texto' },
        ordenValor: (item) => valorOrdenTalle(item.talle),
      },
      {
        header: 'Cantidad',
        render: (item) => item.cant,
        width: 95,
        filtroKey: 'cant',
        filtro: { tipo: 'rango', getValor: (item) => item.cant },
      },
      {
        header: 'Precio',
        render: (item) => `${item.precio}$`,
        width: 110,
        filtroKey: 'precio',
        filtro: { tipo: 'rango', getValor: (item) => item.precio },
      },
    ],
    [lineas]
  );

  const gridTemplateColumns = `${ANCHO_COL_SELECCION}px ${columnas
    .map((c) => `${c.width}px`)
    .join(' ')} minmax(100px, 1fr)`;

  const coincideFiltroColumna = (
    articulo: ArticuloDeVenta,
    columna: ColumnaArticulo,
    filtro: FiltroColumna
  ): boolean => {
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

  const valorOrdenable = (
    item: ArticuloDeVenta,
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
    const excluidos = new Set(articulosExcluidos);
    let resultado = articulos.filter((articulo) => !excluidos.has(articulo.id_articulo));

    if (subgrupoSeleccionado !== null) {
      resultado = resultado.filter((articulo) => articulo.id_subgrupo === subgrupoSeleccionado);
    }

    if (busqueda.trim() !== '') {
      const termino = normalizarBusqueda(busqueda);
      resultado = resultado.filter((articulo) =>
        columnas.some((columna) =>
          normalizarBusqueda(String(columna.render(articulo) ?? '')).includes(termino)
        )
      );
    }

    const entradas = Object.entries(filtrosColumna);
    if (entradas.length > 0) {
      resultado = resultado.filter((articulo) =>
        entradas.every(([key, filtro]) => {
          const columna = columnas.find((c) => c.filtroKey === key);
          if (!columna) return true;
          return coincideFiltroColumna(articulo, columna, filtro);
        })
      );
    }

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
      const talleA = valorOrdenTalle(a.talle);
      const talleB = valorOrdenTalle(b.talle);
      if (talleA === null && talleB === null) return 0;
      if (talleA === null || talleB === null) return talleA === null ? 1 : -1;
      return typeof talleA === 'number' && typeof talleB === 'number'
        ? talleA - talleB
        : String(talleA).localeCompare(String(talleB));
    });
  }, [articulos, articulosExcluidos, subgrupoSeleccionado, busqueda, filtrosColumna, ordenColumnas, columnas]);

  const rowVirtualizer = useVirtualizer({
    count: articulosFiltrados.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  // Click en el header: abre el filtro, o lo quita si ya estaba puesto.
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
  // direccion / la quita). Shift+click: la vuelve el unico criterio.
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

  const columnaAbierta = columnas.find((c) => c.filtroKey === columnaFiltroAbierta) ?? null;

  // Opciones del filtro de la columna abierta, sacadas de los articulos cargados.
  const opcionesFiltroAbierto = useMemo(() => {
    if (!columnaAbierta || columnaAbierta.filtro.tipo !== 'seleccion') return [];
    const filtro = columnaAbierta.filtro;

    const mapa = new Map<number, string>();
    let haySinAsignar = false;
    for (const articulo of articulos) {
      const valores = filtro.getValores(articulo);
      if (valores.length === 0) haySinAsignar = true;
      for (const valor of valores) mapa.set(valor.id, valor.nombre);
    }

    const opciones = [...mapa.entries()]
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
    if (haySinAsignar) opciones.push({ id: SIN_ASIGNAR_ID, nombre: 'Sin asignar' });
    return opciones;
  }, [columnaAbierta, articulos]);

  // Click en una fila o su boton "Agregar": abre el modal de confirmacion en
  // vez de agregar directo, para poder elegir la cantidad y ver el total.
  const handleAgregar = (articulo: ArticuloDeVenta) => {
    setConfirmacionEsMasiva(false);
    setProductosAConfirmar([articulo]);
  };

  const handleConfirmarProductos = (items: ItemAConfirmar[]) => {
    for (const { articulo, cantidad } of items) {
      onAgregar(articulo, cantidad);
    }
    setProductosAConfirmar(null);
    // Solo se limpia la seleccion masiva si la tanda confirmada vino de ahi:
    // un alta individual no deberia descartar lo que el usuario tenia tildado.
    if (confirmacionEsMasiva) setSeleccionados(new Set());
    mostrarNotificacion(
      items.length === 1
        ? `"${items[0].articulo.descripcion ?? 'Artículo'}" agregado a la venta.`
        : `${items.length} artículos agregados a la venta.`
    );
  };

  const toggleSeleccion = (id: number) => {
    setSeleccionados((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });
  };

  const modoSeleccion = seleccionados.size > 0;

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

  // Abre el modal de confirmacion con todos los seleccionados, para poder
  // ajustar la cantidad de cada uno antes de agregarlos.
  const handleAgregarSeleccionados = () => {
    const excluidos = new Set(articulosExcluidos);
    const paraConfirmar = articulos.filter(
      (articulo) => seleccionados.has(articulo.id_articulo) && !excluidos.has(articulo.id_articulo)
    );
    if (paraConfirmar.length === 0) return;

    setConfirmacionEsMasiva(true);
    setProductosAConfirmar(paraConfirmar);
  };

  const tituloPaso =
    paso === 1 ? 'Elegí un colegio o club' : paso === 2 ? 'Elegí un grupo' : 'Agregar Producto';

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
              <Dialog.Panel
                className={`relative w-full transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all ${
                  paso === 3 ? 'max-w-5xl' : 'max-w-2xl'
                }`}
              >
                {/* Notificacion de que se agrego un producto: no cierra el modal, asi
                    se puede seguir agregando. */}
                <div
                  className={`pointer-events-none absolute inset-x-0 top-3 flex justify-center transition-all duration-200 ease-in-out ${
                    notificacion ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
                  }`}
                >
                  <span className='rounded-full bg-green-600 px-4 py-1.5 text-sm font-medium text-white shadow-lg'>
                    ✓ {notificacion}
                  </span>
                </div>

                <Dialog.Title as='h3' className='text-lg font-medium leading-6 text-gray-900'>
                  {tituloPaso}
                </Dialog.Title>

                {/* Migas: muestran lo elegido y permiten volver atras */}
                {cliente && (
                  <div className='flex items-center gap-2 mt-2 mb-4 text-sm'>
                    <button
                      type='button'
                      onClick={() => volverAPaso(1)}
                      className='px-2 py-0.5 rounded border border-violet-500 text-violet-600 cursor-pointer hover:bg-violet-50 transition-colors'
                    >
                      {cliente.nombre} ✕
                    </button>
                    {grupo && (
                      <>
                        <span className='text-gray-300'>›</span>
                        <button
                          type='button'
                          onClick={() => volverAPaso(2)}
                          className='px-2 py-0.5 rounded border border-violet-500 text-violet-600 cursor-pointer hover:bg-violet-50 transition-colors'
                        >
                          {grupo.nombre_grupo} ✕
                        </button>
                      </>
                    )}
                  </div>
                )}

                {!cliente && <div className='mb-4' />}

                {error && (
                  <div className='mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex flex-col'>
                    <span>Ocurrió un error</span>
                    <span className='text-red-500 text-xs'>{error}</span>
                  </div>
                )}

                {/* ---------------- PASO 1: colegio / club ---------------- */}
                {paso === 1 && (
                  <div className='grid grid-cols-2 gap-4'>
                    {cargando && agrupaciones.length === 0 && (
                      <p className='col-span-2 text-sm text-gray-400 text-center py-6'>Cargando...</p>
                    )}

                    {agrupaciones.map((agrupacion) => (
                      <ListaClientesAgrupacion
                        key={agrupacion.id_grupo}
                        agrupacion={agrupacion}
                        onSeleccionar={setCliente}
                      />
                    ))}
                  </div>
                )}

                {/* ---------------- PASO 2: grupo ---------------- */}
                {paso === 2 && (
                  <div className='border border-gray-200 rounded-md overflow-hidden'>
                    {cargando && <p className='text-sm text-gray-400 px-3 py-6 text-center'>Cargando grupos...</p>}

                    {!cargando && grupos.length === 0 && (
                      <p className='text-sm text-gray-400 italic px-3 py-6 text-center'>
                        {cliente?.nombre} no tiene artículos vigentes asociados.
                      </p>
                    )}

                    {!cargando && grupos.length > 0 && (
                      <>
                        <div className='p-2 border-b border-gray-100'>
                          <input
                            type='text'
                            value={busquedaGrupos}
                            onChange={(e) => setBusquedaGrupos(e.target.value)}
                            placeholder='Buscar grupo...'
                            className='w-full rounded border border-gray-300 bg-white py-1.5 px-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30'
                          />
                        </div>
                        <ul className='max-h-96 overflow-y-auto divide-y divide-gray-100'>
                          {gruposFiltrados.length === 0 ? (
                            <li className='px-4 py-3 text-sm text-gray-400 italic'>Sin resultados</li>
                          ) : (
                            gruposFiltrados.map((g) => (
                              <li
                                key={g.id_grupo}
                                onClick={() => setGrupo(g)}
                                className='px-4 py-2.5 text-sm text-gray-700 cursor-pointer hover:bg-amber-50 transition-colors duration-100 ease-in'
                              >
                                {g.nombre_grupo}
                              </li>
                            ))
                          )}
                        </ul>
                      </>
                    )}
                  </div>
                )}

                {/* ---------------- PASO 3: tabla de articulos ---------------- */}
                {paso === 3 && (
                  <>
                    <div className='flex flex-wrap items-center gap-2 mb-3'>
                      <InlineFilterDropdown
                        label='Filtrar por Subgrupo'
                        conBuscador
                        opciones={subgrupos.map((s) => ({ id: s.id_subgrupo, nombre: s.nombre_subgrupo }))}
                        selectedId={subgrupoSeleccionado}
                        onSelect={setSubgrupoSeleccionado}
                        onClear={() => setSubgrupoSeleccionado(null)}
                        disabled={cargando}
                      />

                      <div className='relative flex-1 min-w-[180px] flex items-center'>
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
                          placeholder='Buscar artículo...'
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
                      className='max-h-96 overflow-auto border rounded-md border-black/30'
                    >
                      <div
                        className='grid text-black sticky top-0 z-10 isolate will-change-transform'
                        style={{ gridTemplateColumns, transform: 'translateZ(0)' }}
                      >
                        <span
                          className={`py-2 border-black/35 bg-stone-100 border-b flex items-center justify-center ${
                            modoSeleccion ? 'bg-violet-500' : ''
                          }`}
                        >
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
                                className='rounded border border-white/70 px-3 py-1 text-[13px] font-semibold text-white cursor-pointer transition-colors duration-100 ease-in hover:bg-violet-600 whitespace-nowrap'
                              >
                                Deseleccionar
                              </button>
                              <button
                                type='button'
                                onClick={handleAgregarSeleccionados}
                                className='rounded border border-green-600 bg-green-600 px-3 py-1 text-[13px] font-semibold text-white cursor-pointer transition-colors duration-100 ease-in hover:bg-green-700 whitespace-nowrap'
                              >
                                Agregar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                        {columnas.map((columna) => {
                          const filtroActivo = filtrosColumna[columna.filtroKey];
                          const prioridadOrden = ordenColumnas.findIndex((c) => c.key === columna.filtroKey);
                          const ordenActivo =
                            prioridadOrden === -1 ? null : ordenColumnas[prioridadOrden].direccion;

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
                                title={
                                  filtroActivo
                                    ? `Quitar filtro de ${columna.header}`
                                    : `Filtrar por ${columna.header}`
                                }
                                className={`flex-1 min-w-0 py-2 pl-3 pr-1 flex items-center gap-1 cursor-pointer transition-colors duration-100 ease-in text-left ${
                                  filtroActivo ? 'hover:bg-violet-600' : 'hover:bg-amber-100'
                                }`}
                              >
                                <span className='flex-1 truncate'>{columna.header}</span>
                                <svg
                                  className={`h-3.5 w-3.5 shrink-0 ${
                                    filtroActivo ? 'text-white' : 'text-gray-400'
                                  }`}
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
                                className={`shrink-0 py-2 pl-1.5 pr-1 flex items-center gap-0.5 cursor-pointer transition-colors duration-100 ease-in ${
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
                        <span className='py-2 px-3 border-black/35 bg-stone-100 border-b border-l text-[13px] font-medium flex items-center justify-center'>
                          Acción
                        </span>
                          </>
                        )}
                      </div>

                      {cargando && (
                        <p className='px-3 py-6 text-sm text-gray-400 text-center'>Cargando artículos...</p>
                      )}

                      {!cargando && articulosFiltrados.length === 0 && (
                        <p className='px-3 py-6 text-sm text-gray-400 italic text-center'>
                          No hay artículos disponibles para agregar.
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
                                className='grid text-black text-[13px] group absolute top-0 left-0 w-full cursor-pointer'
                                style={{
                                  gridTemplateColumns,
                                  height: ROW_HEIGHT,
                                  transform: `translateY(${virtualRow.start}px)`,
                                }}
                              >
                                <label
                                  onClick={(e) => e.stopPropagation()}
                                  className={`py-2 border-black/20 border-b flex items-center justify-center cursor-pointer group-hover:bg-amber-50 transition-color duration-100 ease-in ${
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
                                  return (
                                    <p
                                      key={columna.header}
                                      className={`py-2 px-3 border-black/20 border-b border-l flex items-center break-words group-hover:bg-amber-50 transition-color duration-100 ease-in ${
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
                  </>
                )}

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

      <ColumnFilterModal
        isOpen={columnaFiltroAbierta !== null}
        onClose={() => setColumnaFiltroAbierta(null)}
        titulo={columnaAbierta ? `Filtrar por ${columnaAbierta.header}` : ''}
        tipo={columnaAbierta?.filtro.tipo ?? null}
        filtroActual={columnaFiltroAbierta ? filtrosColumna[columnaFiltroAbierta] : undefined}
        opciones={opcionesFiltroAbierto}
        onAplicar={(filtro) => {
          if (!columnaFiltroAbierta) return;
          setFiltrosColumna((prev) => {
            const siguiente = { ...prev };
            if (filtro === null) delete siguiente[columnaFiltroAbierta];
            else siguiente[columnaFiltroAbierta] = filtro;
            return siguiente;
          });
          setColumnaFiltroAbierta(null);
        }}
      />

      <ConfirmarProductoModal
        productos={productosAConfirmar}
        onClose={() => setProductosAConfirmar(null)}
        onConfirmar={handleConfirmarProductos}
      />
    </Transition>
  );
}
