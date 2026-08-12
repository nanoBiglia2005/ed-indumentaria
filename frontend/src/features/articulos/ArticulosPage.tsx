import { useState, useEffect, useMemo, useCallback } from 'react';
import type {
  ARTICULOS,
  GRUPOS_DE_VENTA,
  CLIENTES,
  ARTICULOS_X_GRUPO_VENTA,
  ARTICULOS_X_CLIENTE,
  SUBGRUPOS_DE_VENTA,
  LINEAS,
} from '@backend/types';
import DataGrid from '@/components/tabla/DataGrid';
import { useTablaFiltrable } from '@/components/tabla/useTablaFiltrable';
import type { OpcionFiltro } from '@/components/tabla/tipos';
import SearchInput from '@/components/ui/SearchInput';
import { useDebounce } from '@/hooks/useDebounce';
import { useToggleSet } from '@/hooks/useToggleSet';
import { normalizarBusqueda } from '@/utils/texto';
import { ApiError, mensajeDetallesPrimero } from '@/api/cliente';
import {
  listarArticulos,
  listarArticulosXGrupo,
  listarArticulosXCliente,
  actualizarArticulo,
  eliminarArticulo,
  asignarGrupo,
  quitarGrupo,
  asignarCliente,
  quitarCliente,
  imprimirBarcode,
} from '@/api/articulos';
import {
  listarGrupos,
  listarSubgrupos,
  listarClientes,
  listarLineas,
} from '@/api/agrupaciones';
import CreateArticleModal from '@/features/articulos/modales/CreateArticleModal';
import EditRelacionesModal from '@/features/articulos/modales/EditRelacionesModal';
import type { TextosRelacion } from '@/features/articulos/modales/EditRelacionesModal';
import EditSubgruposModal from '@/features/articulos/modales/EditSubgruposModal';
import EditLineaModal from '@/features/articulos/modales/EditLineaModal';
import EliminarArticuloModal from '@/features/articulos/modales/EliminarArticuloModal';
import EditFieldModal from '@/features/articulos/modales/EditFieldModal';
import type { CampoEditable } from '@/features/articulos/modales/EditFieldModal';
import CrearAgrupacionModal from '@/features/configuracion/modales/CrearAgrupacionModal';
import type { TipoAgrupacion } from '@/types/agrupaciones';
import ColumnFilterModal from '@/components/tabla/ColumnFilterModal';
import AccionMasivaModal from '@/features/articulos/modales/AccionMasivaModal';
import type { AccionMasiva } from '@/features/articulos/modales/AccionMasivaModal';
import {
  crearColumnasArticulos,
  ROW_HEIGHT,
  ALTO_LINEA,
  MAX_LINEAS_CELDA,
  ANCHO_COL_SELECCION,
} from './columnas';
import FilterDropdown from './FilterDropdown';
import ToolbarSeleccionArticulos from './ToolbarSeleccionArticulos';

const TEXTOS_EDITAR_GRUPOS: TextosRelacion = {
  titulo: 'Editar Grupos',
  label: 'Grupos de Articulos',
  labelAgregar: 'Agregar Grupo',
  textoVacio: 'No asignado a ningún grupo',
  errorSync: 'Hubo un error al actualizar los grupos asociados.',
};

const TEXTOS_EDITAR_CLIENTES: TextosRelacion = {
  titulo: 'Editar Colegios/Clubes',
  label: 'Colegios/Clubes',
  labelAgregar: 'Agregar Colegio/Club',
  textoVacio: 'No asignado a ningún cliente',
  errorSync: 'Hubo un error al actualizar los colegios/clubes asociados.',
};

// Desempate final del orden (esta tabla ordena talles alfabeticamente; la del
// modal de venta los ordena numericamente cuando puede).
const desempateTalle = (a: ARTICULOS, b: ARTICULOS) => (a.talle ?? '').localeCompare(b.talle ?? '');

// Mensaje de error de impresion: el print-service responde a veces con
// { message } y a veces con { detail } (FastAPI).
const mensajeErrorImpresion = (err: unknown) => {
  if (err instanceof ApiError) {
    const datos = err.datos as { message?: string; detail?: string } | null;
    return datos?.message ?? datos?.detail ?? 'No se pudo imprimir el articulo.';
  }
  return err instanceof Error ? err.message : 'No se pudo imprimir el articulo.';
};

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
  const busqueda = useDebounce(busquedaInput, 150).trim();

  // --- Modales (booleans separados + el articulo activo) ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [articuloAEditar, setArticuloAEditar] = useState<ARTICULOS | null>(null);
  const [isEditGruposOpen, setIsEditGruposOpen] = useState(false);
  const [isEditClientesOpen, setIsEditClientesOpen] = useState(false);
  const [isEditSubgruposOpen, setIsEditSubgruposOpen] = useState(false);
  const [isEditLineaOpen, setIsEditLineaOpen] = useState(false);
  const [isEliminarModalOpen, setIsEliminarModalOpen] = useState(false);
  const [campoAEditar, setCampoAEditar] = useState<CampoEditable | null>(null);
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [crearModalTipo, setCrearModalTipo] = useState<TipoAgrupacion | null>(null);
  const [accionMasiva, setAccionMasiva] = useState<AccionMasiva | null>(null);

  // --- Acciones por fila / masivas ---
  const [imprimiendoId, setImprimiendoId] = useState<number | null>(null);
  const [impresoId, setImpresoId] = useState<number | null>(null);
  const [actualizandoMasivo, setActualizandoMasivo] = useState(false);

  const { seleccionados, toggle: toggleSeleccion, setSeleccionados } = useToggleSet<number>();

  // --- Carga de datos (si algo falla solo se loguea, como siempre) ---
  const fetchArticulos = () => {
    listarArticulos()
      .then(setDatosBackend)
      .catch((error) => console.error('Error al conectar con el backend:', error));
  };

  const fetchArticulosXGrupo = () => {
    listarArticulosXGrupo()
      .then(setArticulosXGrupo)
      .catch((error) => console.error('Error al obtener ARTICULOS_X_GRUPO_VENTA:', error));
  };

  const fetchArticulosXCliente = () => {
    listarArticulosXCliente()
      .then(setArticulosXCliente)
      .catch((error) => console.error('Error al obtener ARTICULOS_X_CLIENTE:', error));
  };

  const fetchGrupos = () => {
    listarGrupos()
      .then(setGrupos)
      .catch((error) => console.error('Error al obtener los grupos:', error));
  };

  const fetchSubgrupos = () => {
    listarSubgrupos()
      .then(setSubgrupos)
      .catch((error) => console.error('Error al obtener los subgrupos:', error));
  };

  const fetchClientes = () => {
    listarClientes()
      .then(setClientes)
      .catch((error) => console.error('Error al obtener los clientes:', error));
  };

  const fetchLineas = () => {
    listarLineas()
      .then(setLineas)
      .catch((error) => console.error('Error al obtener las lineas:', error));
  };

  useEffect(() => {
    fetchArticulos();
    fetchGrupos();
    fetchClientes();
    fetchSubgrupos();
    fetchLineas();
    fetchArticulosXGrupo();
    fetchArticulosXCliente();
  }, []);

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

  const handleArticuloActualizado = () => {
    fetchArticulos();
    fetchArticulosXGrupo();
    fetchArticulosXCliente();
  };

  // --- Apertura de modales de edicion ---
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

  const abrirEdicionCampo = useCallback((articulo: ARTICULOS, campo: CampoEditable) => {
    setArticuloAEditar(articulo);
    setCampoAEditar(campo);
    setIsFieldModalOpen(true);
  }, []);

  // --- Acciones por fila ---
  const handleImprimir = async (articulo: ARTICULOS) => {
    setImprimiendoId(articulo.id_articulo);
    try {
      const resultado = (await imprimirBarcode(articulo.id_articulo, 1)) as {
        status?: string;
        message?: string;
        detail?: string;
      } | null;
      if (resultado?.status === 'error') {
        throw new Error(resultado.message ?? resultado.detail ?? 'No se pudo imprimir el articulo.');
      }
      setImpresoId(articulo.id_articulo);
      setTimeout(() => {
        setImpresoId((actual) => (actual === articulo.id_articulo ? null : actual));
      }, 1500);
    } catch (error) {
      alert(mensajeErrorImpresion(error));
    } finally {
      setImprimiendoId(null);
    }
  };

  const handleToggleVigente = useCallback(async (articulo: ARTICULOS) => {
    try {
      await actualizarArticulo(articulo.id_articulo, { vigente: !articulo.vigente });
      fetchArticulos();
    } catch (error) {
      alert(mensajeDetallesPrimero(error, 'No se pudo actualizar la vigencia del articulo.'));
    }
  }, []);

  // --- Mapas articulo -> asociaciones (para chips y filtros) ---
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

  const columnas = useMemo(
    () =>
      crearColumnasArticulos({
        lineas,
        gruposDeArticulo,
        clientesDeArticulo,
        subgruposDeArticulo,
        gruposPorArticulo,
        clientesPorArticulo,
        subgruposPorArticulo,
        abrirEdicionGrupos,
        abrirEdicionClientes,
        abrirEdicionSubgrupos,
        abrirEdicionLinea,
        abrirEdicionCampo,
        onToggleVigente: handleToggleVigente,
      }),
    [
      lineas,
      gruposDeArticulo,
      clientesDeArticulo,
      subgruposDeArticulo,
      gruposPorArticulo,
      clientesPorArticulo,
      subgruposPorArticulo,
      abrirEdicionGrupos,
      abrirEdicionClientes,
      abrirEdicionSubgrupos,
      abrirEdicionLinea,
      abrirEdicionCampo,
      handleToggleVigente,
    ]
  );

  // --- Filtros de pagina (dropdowns + busqueda global) ---
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

  // --- Motor de filtros por columna + multi-orden ---
  const tabla = useTablaFiltrable({
    filas: articulosBase,
    columnas,
    desempate: desempateTalle,
  });
  const articulosFiltrados = tabla.filasVisibles;

  // Si un articulo seleccionado deja de existir (p.ej. fue eliminado),
  // se lo quita de la seleccion.
  useEffect(() => {
    setSeleccionados((prev) => {
      if (prev.size === 0) return prev;
      const idsExistentes = new Set(datosBackend.map((a) => a.id_articulo));
      const siguiente = new Set([...prev].filter((id) => idsExistentes.has(id)));
      return siguiente.size === prev.size ? prev : siguiente;
    });
  }, [datosBackend, setSeleccionados]);

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
        [...seleccionados].map((id) => actualizarArticulo(id, { vigente }))
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
      const resultados = await Promise.allSettled(ids.map((id) => eliminarArticulo(id)));
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
          const resultado = (await imprimirBarcode(id, 1)) as { status?: string } | null;
          if (resultado?.status === 'error') fallidos++;
        } catch {
          fallidos++;
        }
      }
      if (fallidos > 0) {
        throw new Error(`No se pudieron imprimir ${fallidos} de ${ids.length} articulos.`);
      }
    }
  };

  // --- Filtros de pagina: subgrupos acotados al grupo elegido ---
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

  const idsGruposDelArticulo = articuloAEditar
    ? articulosXGrupo
        .filter((rel) => rel.id_articulo === articuloAEditar.id_articulo)
        .map((rel) => rel.id_grupo_venta)
    : [];

  const idsClientesDelArticulo = articuloAEditar
    ? articulosXCliente
        .filter((rel) => rel.id_articulo === articuloAEditar.id_articulo)
        .map((rel) => rel.id_cliente)
    : [];

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
            <SearchInput
              valor={busquedaInput}
              onCambio={setBusquedaInput}
              placeholder='Buscar articulo...'
              claseContenedor='relative w-72 flex items-center py-2'
            />
          </div>

          <DataGrid<ARTICULOS>
            filas={articulosFiltrados}
            columnas={columnas}
            keyDe={(item) => item.id_articulo}
            altoFila={ROW_HEIGHT}
            anchoColSeleccion={ANCHO_COL_SELECCION}
            anchoUltimaColumna='minmax(110px, 1fr)'
            claseContenedor='flex-1 min-h-0 w-full min-w-0 overflow-auto border rounded-xl border-black/30 mb-5 select-none shadow'
            estiloCeldaTexto={{
              display: '-webkit-box',
              WebkitLineClamp: MAX_LINEAS_CELDA,
              WebkitBoxOrient: 'vertical',
              lineHeight: `${ALTO_LINEA}px`,
              minWidth: 0,
            }}
            filtrosColumna={tabla.filtrosColumna}
            ordenColumnas={tabla.ordenColumnas}
            onClickHeader={tabla.handleClickHeader}
            onClickOrdenar={tabla.handleClickOrdenar}
            busqueda={busqueda}
            resaltarPorFiltroColumna
            seleccionados={seleccionados}
            onToggleSeleccion={toggleSeleccion}
            todosSeleccionados={todosSeleccionados}
            onToggleTodos={handleSeleccionarTodos}
            resaltarFilaSeleccionada
            toolbarSeleccion={
              <ToolbarSeleccionArticulos
                cantidad={seleccionados.size}
                actualizando={actualizandoMasivo}
                onDeseleccionar={() => setSeleccionados(new Set())}
                onVigenciaMasiva={handleVigenciaMasiva}
                onImprimir={() => setAccionMasiva('imprimir')}
                onEliminar={() => setAccionMasiva('eliminar')}
              />
            }
            renderAccion={(item) => (
              <>
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
              </>
            )}
            claseCeldaAccion={(item) =>
              `py-3 border-black/20 border-l border-b group-hover:bg-amber-50 transition-color duration-100 ease-in flex flex-col items-center justify-center gap-2 ${
                seleccionados.has(item.id_articulo) ? 'bg-violet-50' : ''
              }`
            }
            estadoVacio={
              <p className='px-4 py-6 text-gray-400 italic text-center'>
                No hay articulos que coincidan con la busqueda
              </p>
            }
          />
        </div>
      </div>

      <CreateArticleModal
        abierto={isModalOpen}
        onCerrar={() => setIsModalOpen(false)}
        onExito={handleArticuloActualizado}
        grupos={grupos}
        clientes={clientes}
      />

      <EditRelacionesModal
        abierto={isEditGruposOpen}
        onCerrar={() => setIsEditGruposOpen(false)}
        onExito={handleArticuloActualizado}
        articulo={articuloAEditar}
        textos={TEXTOS_EDITAR_GRUPOS}
        opciones={grupos.map((g) => ({ id: g.id_grupo, nombre: g.nombre_grupo ?? `Grupo ${g.id_grupo}` }))}
        idsAsignados={idsGruposDelArticulo}
        asignar={asignarGrupo}
        quitar={quitarGrupo}
      />

      <EditRelacionesModal
        abierto={isEditClientesOpen}
        onCerrar={() => setIsEditClientesOpen(false)}
        onExito={handleArticuloActualizado}
        articulo={articuloAEditar}
        textos={TEXTOS_EDITAR_CLIENTES}
        opciones={clientes.map((c) => ({ id: c.id_cliente, nombre: c.nombre }))}
        idsAsignados={idsClientesDelArticulo}
        asignar={asignarCliente}
        quitar={quitarCliente}
      />

      <EditSubgruposModal
        abierto={isEditSubgruposOpen}
        onCerrar={() => setIsEditSubgruposOpen(false)}
        onExito={handleArticuloActualizado}
        articulo={articuloAEditar}
        grupos={grupos}
        subgrupos={subgrupos}
        articulosXGrupo={articulosXGrupo}
      />

      <EditLineaModal
        abierto={isEditLineaOpen}
        onCerrar={() => setIsEditLineaOpen(false)}
        onExito={handleArticuloActualizado}
        articulo={articuloAEditar}
        lineas={lineas}
      />

      <EliminarArticuloModal
        abierto={isEliminarModalOpen}
        onCerrar={() => setIsEliminarModalOpen(false)}
        onExito={handleArticuloActualizado}
        articulo={articuloAEditar}
      />

      <EditFieldModal
        abierto={isFieldModalOpen}
        onCerrar={() => setIsFieldModalOpen(false)}
        onExito={handleArticuloActualizado}
        articulo={articuloAEditar}
        campo={campoAEditar}
      />

      <CrearAgrupacionModal
        abierto={crearModalTipo !== null}
        onCerrar={() => setCrearModalTipo(null)}
        onGuardado={handleAgrupacionCreada}
        tipo={crearModalTipo ?? 'grupo'}
        grupos={grupos}
        grupoPreseleccionado={grupoSeleccionado}
      />

      <AccionMasivaModal
        abierto={accionMasiva !== null}
        onCerrar={() => setAccionMasiva(null)}
        accion={accionMasiva}
        cantidad={seleccionados.size}
        onConfirmar={ejecutarAccionMasiva}
      />

      <ColumnFilterModal
        abierto={tabla.columnaAbierta !== null}
        onCerrar={() => tabla.setColumnaFiltroAbierta(null)}
        titulo={tabla.columnaAbierta?.header ?? ''}
        tipo={tabla.columnaAbierta?.filtro.tipo ?? null}
        filtroActual={tabla.columnaAbierta ? tabla.filtrosColumna[tabla.columnaAbierta.filtroKey] : undefined}
        opciones={tabla.opcionesFiltroAbierto}
        onAplicar={tabla.handleAplicarFiltro}
      />
    </>
  );
}

export default ArticulosPage;
