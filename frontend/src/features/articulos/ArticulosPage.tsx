// Tabla de articulos, paginada EN LA BASE: la tabla no se carga entera. Los
// filtros de pagina, la busqueda, los filtros por columna, el orden y la
// paginacion viajan al backend como parametros y vuelven 30 filas + el total
// que coincide (ver api/articulos.ts y backend/lib/articulosConsulta.js).
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type {
  GRUPOS_DE_VENTA,
  CLIENTES_MAYORISTAS,
  SUBGRUPOS_DE_VENTA,
  LINEAS,
  TIPOS_DE_PAGO,
} from '@backend/types';
import DataGrid from '@/components/tabla/DataGrid';
import Paginador from '@/components/tabla/Paginador';
import { useTablaServidor } from '@/components/tabla/useTablaServidor';
import { SIN_ASIGNAR_ID } from '@/components/tabla/tipos';
import type { OpcionFiltro } from '@/components/tabla/tipos';
import SearchInput from '@/components/ui/SearchInput';
import { useDebounce } from '@/hooks/useDebounce';
import { useToggleSet } from '@/hooks/useToggleSet';
import { ApiError, mensajeDetallesPrimero } from '@/api/cliente';
import {
  listarArticulosPagina,
  listarIdsArticulos,
  listarOpcionesColumna,
  actualizarArticulo,
  asignarCliente,
  quitarCliente,
  imprimirBarcode,
} from '@/api/articulos';
import type { ArticuloListado, ParamsArticulos } from '@/api/articulos';
import { listarGrupos, listarSubgrupos, listarClientes, listarLineas } from '@/api/agrupaciones';
import { listarTiposDePago } from '@/api/tiposDePago';
import CreateArticleModal from '@/features/articulos/modales/CreateArticleModal';
import EditRelacionesModal from '@/features/articulos/modales/EditRelacionesModal';
import type { TextosRelacion } from '@/features/articulos/modales/EditRelacionesModal';
import EditGrupoModal from '@/features/articulos/modales/EditGrupoModal';
import EditSubgrupoModal from '@/features/articulos/modales/EditSubgrupoModal';
import EditLineaModal from '@/features/articulos/modales/EditLineaModal';
import EditFieldModal from '@/features/articulos/modales/EditFieldModal';
import type { CampoEditable } from '@/features/articulos/modales/EditFieldModal';
import CrearAgrupacionModal from '@/features/configuracion/modales/CrearAgrupacionModal';
import type { TipoAgrupacion } from '@/types/agrupaciones';
import ColumnFilterModal from '@/components/tabla/ColumnFilterModal';
import AccionMasivaModal from '@/features/articulos/modales/AccionMasivaModal';
import {
  crearColumnasArticulos,
  ROW_HEIGHT,
  ALTO_LINEA,
  MAX_LINEAS_CELDA,
  ANCHO_COL_SELECCION,
} from './columnas';
import FilterDropdown from './FilterDropdown';
import ToolbarSeleccionArticulos from './ToolbarSeleccionArticulos';

const TAMANO_PAGINA = 30;

/** Opciones de un filtro de seleccion, con la consulta que las produjo. */
interface OpcionesCargadas {
  columna: string;
  params: ParamsArticulos;
  valores: OpcionFiltro[];
}

const TEXTOS_EDITAR_CLIENTES: TextosRelacion = {
  titulo: 'Editar Colegios/Clubes',
  label: 'Colegios/Clubes',
  labelAgregar: 'Agregar Colegio/Club',
  textoVacio: 'No asignado a ningún cliente',
  errorSync: 'Hubo un error al actualizar los colegios/clubes asociados.',
};

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
  // --- Pagina actual de articulos (lo unico que se trae de la tabla) ---
  const [articulos, setArticulos] = useState<ArticuloListado[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  // Se incrementa para volver a pedir la pagina actual tras una edicion.
  const [recarga, setRecarga] = useState(0);

  // --- Catalogos completos (tablas chicas, se cargan una vez) ---
  const [grupos, setGrupos] = useState<GRUPOS_DE_VENTA[]>([]);
  const [clientes, setClientes] = useState<CLIENTES_MAYORISTAS[]>([]);
  const [subgrupos, setSubgrupos] = useState<SUBGRUPOS_DE_VENTA[]>([]);
  const [lineas, setLineas] = useState<LINEAS[]>([]);
  const [metodosDePago, setMetodosDePago] = useState<TIPOS_DE_PAGO[]>([]);

  const [grupoSeleccionado, setGrupoSeleccionado] = useState<number | null>(null);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<number | null>(null);
  const [subgrupoSeleccionado, setSubgrupoSeleccionado] = useState<number | null>(null);

  const [busquedaInput, setBusquedaInput] = useState('');
  // Un poco mas largo que en la original: cada tecleo es una consulta a la base.
  const busqueda = useDebounce(busquedaInput, 300).trim();

  // Opciones del filtro de seleccion abierto (las resuelve la base). Se guardan
  // junto con la columna y los parametros con los que se calcularon: mientras
  // esa marca no coincida con el filtro que se acaba de abrir, las opciones que
  // hay en memoria son de otra consulta y no se muestran.
  const [opciones, setOpciones] = useState<OpcionesCargadas | null>(null);

  // --- Modales (booleans separados + el articulo activo) ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [articuloAEditar, setArticuloAEditar] = useState<ArticuloListado | null>(null);
  const [isEditGrupoOpen, setIsEditGrupoOpen] = useState(false);
  const [isEditClientesOpen, setIsEditClientesOpen] = useState(false);
  const [isEditSubgrupoOpen, setIsEditSubgrupoOpen] = useState(false);
  const [isEditLineaOpen, setIsEditLineaOpen] = useState(false);
  const [campoAEditar, setCampoAEditar] = useState<CampoEditable | null>(null);
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [crearModalTipo, setCrearModalTipo] = useState<TipoAgrupacion | null>(null);
  const [imprimirMasivoAbierto, setImprimirMasivoAbierto] = useState(false);

  // --- Acciones por fila / masivas ---
  const [imprimiendoId, setImprimiendoId] = useState<number | null>(null);
  const [impresoId, setImpresoId] = useState<number | null>(null);
  const [actualizandoMasivo, setActualizandoMasivo] = useState(false);
  const [seleccionandoTodos, setSeleccionandoTodos] = useState(false);

  const { seleccionados, toggle: toggleSeleccion, setSeleccionados } = useToggleSet<number>();

  const recargarPagina = useCallback(() => setRecarga((n) => n + 1), []);

  // --- Carga de los catalogos (si algo falla solo se loguea, como siempre) ---
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
    fetchGrupos();
    fetchClientes();
    fetchSubgrupos();
    fetchLineas();
    // Los recargos pueden haber cambiado en Configuracion: se leen al entrar.
    listarTiposDePago()
      .then(setMetodosDePago)
      .catch((error) => console.error('Error al obtener los metodos de pago:', error));
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

  // Tras editar/crear un articulo alcanza con volver a pedir la pagina actual.
  const handleArticuloActualizado = recargarPagina;

  // --- Apertura de modales de edicion ---
  const abrirEdicionGrupo = useCallback((articulo: ArticuloListado) => {
    setArticuloAEditar(articulo);
    setIsEditGrupoOpen(true);
  }, []);

  const abrirEdicionClientes = useCallback((articulo: ArticuloListado) => {
    setArticuloAEditar(articulo);
    setIsEditClientesOpen(true);
  }, []);

  const abrirEdicionSubgrupo = useCallback((articulo: ArticuloListado) => {
    setArticuloAEditar(articulo);
    setIsEditSubgrupoOpen(true);
  }, []);

  const abrirEdicionLinea = useCallback((articulo: ArticuloListado) => {
    setArticuloAEditar(articulo);
    setIsEditLineaOpen(true);
  }, []);

  const abrirEdicionCampo = useCallback((articulo: ArticuloListado, campo: CampoEditable) => {
    setArticuloAEditar(articulo);
    setCampoAEditar(campo);
    setIsFieldModalOpen(true);
  }, []);

  // --- Acciones por fila ---
  const handleImprimir = async (articulo: ArticuloListado) => {
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

  const handleToggleVigente = useCallback(
    async (articulo: ArticuloListado) => {
      try {
        await actualizarArticulo(articulo.id_articulo, { vigente: !articulo.vigente });
        recargarPagina();
      } catch (error) {
        alert(mensajeDetallesPrimero(error, 'No se pudo actualizar la vigencia del articulo.'));
      }
    },
    [recargarPagina]
  );

  // --- Grupo y subgrupo: campos propios del articulo (relacion uno-a-muchos),
  // se resuelven contra los catalogos ya cargados ---
  const grupoPorId = useMemo(
    () =>
      new Map(
        grupos.map((g) => [g.id_grupo, { id: g.id_grupo, nombre: g.nombre_grupo ?? `Grupo ${g.id_grupo}` }])
      ),
    [grupos]
  );

  const subgrupoPorId = useMemo(
    () => new Map(subgrupos.map((s) => [s.id_subgrupo, { id: s.id_subgrupo, nombre: s.nombre_subgrupo }])),
    [subgrupos]
  );

  const grupoDeArticulo = useCallback(
    (articulo: ArticuloListado): OpcionFiltro | null => grupoPorId.get(articulo.id_grupo) ?? null,
    [grupoPorId]
  );

  const subgrupoDeArticulo = useCallback(
    (articulo: ArticuloListado): OpcionFiltro | null =>
      articulo.id_subgrupo === null ? null : subgrupoPorId.get(articulo.id_subgrupo) ?? null,
    [subgrupoPorId]
  );

  const columnas = useMemo(
    () =>
      crearColumnasArticulos({
        lineas,
        metodosDePago,
        grupoDeArticulo,
        subgrupoDeArticulo,
        abrirEdicionGrupo,
        abrirEdicionClientes,
        abrirEdicionSubgrupo,
        abrirEdicionLinea,
        abrirEdicionCampo,
        onToggleVigente: handleToggleVigente,
      }),
    [
      lineas,
      // metodosDePago se carga async al montar (arranca en []). Sin esta
      // dependencia, el memo devolvia las columnas calculadas con la lista
      // vacia y las columnas de precio por metodo no aparecian; solo se veian
      // si `lineas` resolvia despues y forzaba el recalculo por casualidad.
      metodosDePago,
      grupoDeArticulo,
      subgrupoDeArticulo,
      abrirEdicionGrupo,
      abrirEdicionClientes,
      abrirEdicionSubgrupo,
      abrirEdicionLinea,
      abrirEdicionCampo,
      handleToggleVigente,
    ]
  );

  // --- Estado de filtros por columna + multi-orden (sin filtrar en memoria) ---
  const tabla = useTablaServidor({ columnas, opciones: opciones?.valores ?? [] });

  // Todo lo que define QUE filas pide la tabla. Cambia de identidad solo cuando
  // cambia algun filtro, la busqueda o el orden: la pagina no entra aca.
  const params = useMemo<ParamsArticulos>(
    () => ({
      busqueda,
      idGrupo: grupoSeleccionado,
      idSubgrupo: subgrupoSeleccionado,
      idCliente: clienteSeleccionado,
      filtros: tabla.filtrosColumna,
      orden: tabla.ordenColumnas,
    }),
    [
      busqueda,
      grupoSeleccionado,
      subgrupoSeleccionado,
      clienteSeleccionado,
      tabla.filtrosColumna,
      tabla.ordenColumnas,
    ]
  );

  // Cualquier cambio de filtro/busqueda/orden vuelve a la primera pagina. Se
  // ajusta durante el render (no en un efecto) para que la consulta salga una
  // sola vez, ya con la pagina 1.
  const [paramsPrevios, setParamsPrevios] = useState(params);
  if (paramsPrevios !== params) {
    setParamsPrevios(params);
    setPagina(1);
  }

  // Las respuestas pueden llegar desordenadas (una consulta lenta despues de
  // una rapida): solo se acepta la de la ultima peticion disparada.
  const secuenciaPagina = useRef(0);

  useEffect(() => {
    const peticion = ++secuenciaPagina.current;
    setCargando(true);

    listarArticulosPagina(params, pagina, TAMANO_PAGINA)
      .then((respuesta) => {
        if (peticion !== secuenciaPagina.current) return;
        setArticulos(respuesta.articulos);
        setTotal(respuesta.total);
        // La pagina puede quedar fuera de rango si se borraron articulos.
        const ultima = Math.max(1, Math.ceil(respuesta.total / TAMANO_PAGINA));
        if (pagina > ultima) setPagina(ultima);
      })
      .catch((error) => {
        if (peticion !== secuenciaPagina.current) return;
        console.error('Error al conectar con el backend:', error);
      })
      .finally(() => {
        if (peticion === secuenciaPagina.current) setCargando(false);
      });
  }, [params, pagina, recarga]);

  // Opciones del filtro de seleccion recien abierto. El backend las calcula
  // sobre las filas que pasan todos los DEMAS filtros (igual que la tabla
  // original, que las derivaba de las filas visibles excluyendo este filtro).
  const columnaAbierta = tabla.columnaAbierta;

  // Columna cuyas opciones hay que pedir, o null si el filtro abierto no las
  // necesita (los de texto y rango, y "Vigente", que tiene opciones fijas).
  const columnaQueNecesitaOpciones =
    columnaAbierta && columnaAbierta.filtro.tipo === 'seleccion' && !columnaAbierta.filtro.opcionesEstaticas
      ? columnaAbierta.filtroKey
      : null;

  // Hasta que las opciones sean las de ESTA columna con ESTOS filtros, el modal
  // no se abre: si no, mostraria por un instante las de la consulta anterior.
  const opcionesListas =
    columnaQueNecesitaOpciones === null ||
    (opciones !== null && opciones.columna === columnaQueNecesitaOpciones && opciones.params === params);

  const secuenciaOpciones = useRef(0);

  useEffect(() => {
    if (columnaQueNecesitaOpciones === null || opcionesListas) return;

    const peticion = ++secuenciaOpciones.current;

    listarOpcionesColumna(params, columnaQueNecesitaOpciones)
      .then(({ opciones: valores, haySinAsignar }) => {
        if (peticion !== secuenciaOpciones.current) return;
        setOpciones({
          columna: columnaQueNecesitaOpciones,
          params,
          valores: haySinAsignar ? [...valores, { id: SIN_ASIGNAR_ID, nombre: 'Sin asignar' }] : valores,
        });
      })
      .catch((error) => {
        if (peticion !== secuenciaOpciones.current) return;
        console.error('Error al obtener las opciones del filtro:', error);
        // Se guarda vacio bajo la misma marca para que el modal abra igual en
        // vez de quedarse esperando para siempre.
        setOpciones({ columna: columnaQueNecesitaOpciones, params, valores: [] });
      });
  }, [columnaQueNecesitaOpciones, opcionesListas, params]);

  // --- Seleccion: el checkbox del header opera sobre la pagina visible ---
  const todosSeleccionados =
    articulos.length > 0 && articulos.every((a) => seleccionados.has(a.id_articulo));

  const handleSeleccionarTodos = () => {
    setSeleccionados((prev) => {
      const siguiente = new Set(prev);
      if (todosSeleccionados) {
        for (const articulo of articulos) siguiente.delete(articulo.id_articulo);
      } else {
        for (const articulo of articulos) siguiente.add(articulo.id_articulo);
      }
      return siguiente;
    });
  };

  // Con la pagina entera marcada se ofrece extender la seleccion a todos los
  // articulos que coinciden con los filtros (el backend devuelve solo los ids).
  const puedeSeleccionarLosQueCoinciden = todosSeleccionados && seleccionados.size < total;

  const handleSeleccionarLosQueCoinciden = async () => {
    setSeleccionandoTodos(true);
    try {
      const { ids } = await listarIdsArticulos(params);
      setSeleccionados(new Set(ids));
    } catch (error) {
      alert(mensajeDetallesPrimero(error, 'No se pudieron seleccionar todos los articulos.'));
    } finally {
      setSeleccionandoTodos(false);
    }
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
      recargarPagina();
    } finally {
      setActualizandoMasivo(false);
    }
  };

  // Ejecuta la impresion masiva confirmada en el modal. Si algo falla, lanza
  // para que el modal muestre el error.
  const ejecutarImpresionMasiva = async () => {
    const ids = [...seleccionados];

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

  const idsClientesDelArticulo = articuloAEditar ? articuloAEditar.clientes.map((c) => c.id) : [];

  return (
    <>
      <div className='flex flex-col justify-center flex-1 min-w-0 px-10 py-6'>
        <div className='border px-3 rounded-xl border-violet-500 h-full min-w-0 flex flex-col shadow-xl'>
          <div className='flex flex-wrap gap-y-2 justify-between my-2'>
            <div className='flex flex-wrap gap-1.5 sm:gap-2 lg:gap-4 select-none'>
              <button
                onClick={() => setIsModalOpen(true)}
                className='rounded flex items-center py-1 px-2 sm:py-1.5 sm:px-2.5 lg:py-2 lg:px-3 text-white font-semibold text-sm sm:text-base lg:text-lg border cursor-pointer bg-violet-500 whitespace-nowrap transition-colors
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

          <DataGrid<ArticuloListado>
            filas={articulos}
            columnas={columnas}
            keyDe={(item) => item.id_articulo}
            altoFila={ROW_HEIGHT}
            anchoColSeleccion={ANCHO_COL_SELECCION}
            anchoUltimaColumna='minmax(110px, 1fr)'
            claseContenedor='flex-1 min-h-0 w-full min-w-0 overflow-auto border rounded-xl border-black/30 select-none shadow'
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
              <>
                <ToolbarSeleccionArticulos
                  cantidad={seleccionados.size}
                  actualizando={actualizandoMasivo}
                  onDeseleccionar={() => setSeleccionados(new Set())}
                  onVigenciaMasiva={handleVigenciaMasiva}
                  onImprimir={() => setImprimirMasivoAbierto(true)}
                />
                {puedeSeleccionarLosQueCoinciden && (
                  <button
                    type='button'
                    onClick={handleSeleccionarLosQueCoinciden}
                    disabled={seleccionandoTodos || actualizandoMasivo}
                    className='rounded border border-amber-300 px-3 py-1 text-[13px] font-semibold text-amber-200 cursor-pointer transition-colors duration-100 ease-in hover:bg-violet-600 disabled:opacity-50 disabled:cursor-wait whitespace-nowrap'
                  >
                    {seleccionandoTodos
                      ? 'Seleccionando...'
                      : `Seleccionar los ${total.toLocaleString('es-AR')} que coinciden`}
                  </button>
                )}
              </>
            }
            renderAccion={(item) => (
              <>
                <button
                  type='button'
                  onClick={() => handleImprimir(item)}
                  disabled={imprimiendoId === item.id_articulo}
                  className={`rounded border px-3 py-1 text-sm font-semibold text-white transition-colors duration-100 ease-in ${
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
              </>
            )}
            claseCeldaAccion={(item) =>
              `py-3 border-black/20 border-l border-b group-hover:bg-amber-50 transition-colors duration-100 ease-in flex flex-col items-center justify-center gap-2 ${
                seleccionados.has(item.id_articulo) ? 'bg-violet-50' : ''
              }`
            }
            // Solo se vacia la tabla en la primera carga: al cambiar de pagina o
            // de filtro se dejan las filas anteriores hasta que llegan las nuevas
            // (el aviso de "Cargando..." lo da el paginador), asi no parpadea.
            cargando={cargando && articulos.length === 0}
            estadoCargando={
              <p className='px-4 py-6 text-gray-400 italic text-center'>Cargando articulos...</p>
            }
            estadoVacio={
              <p className='px-4 py-6 text-gray-400 italic text-center'>
                No hay articulos que coincidan con la busqueda
              </p>
            }
          />

          <Paginador
            pagina={pagina}
            tamano={TAMANO_PAGINA}
            total={total}
            cargando={cargando}
            onCambiarPagina={setPagina}
          />
        </div>
      </div>

      <CreateArticleModal
        abierto={isModalOpen}
        onCerrar={() => setIsModalOpen(false)}
        onExito={handleArticuloActualizado}
        grupos={grupos}
        subgrupos={subgrupos}
        lineas={lineas}
        clientes={clientes}
        metodosDePago={metodosDePago}
      />

      <EditGrupoModal
        abierto={isEditGrupoOpen}
        onCerrar={() => setIsEditGrupoOpen(false)}
        onExito={handleArticuloActualizado}
        articulo={articuloAEditar}
        grupos={grupos}
        subgrupos={subgrupos}
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

      <EditSubgrupoModal
        abierto={isEditSubgrupoOpen}
        onCerrar={() => setIsEditSubgrupoOpen(false)}
        onExito={handleArticuloActualizado}
        articulo={articuloAEditar}
        grupos={grupos}
        subgrupos={subgrupos}
      />

      <EditLineaModal
        abierto={isEditLineaOpen}
        onCerrar={() => setIsEditLineaOpen(false)}
        onExito={handleArticuloActualizado}
        articulo={articuloAEditar}
        lineas={lineas}
      />

      <EditFieldModal
        abierto={isFieldModalOpen}
        onCerrar={() => setIsFieldModalOpen(false)}
        onExito={handleArticuloActualizado}
        articulo={articuloAEditar}
        campo={campoAEditar}
        metodosDePago={metodosDePago}
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
        abierto={imprimirMasivoAbierto}
        onCerrar={() => setImprimirMasivoAbierto(false)}
        cantidad={seleccionados.size}
        onConfirmar={ejecutarImpresionMasiva}
      />

      <ColumnFilterModal
        abierto={tabla.columnaAbierta !== null && opcionesListas}
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
