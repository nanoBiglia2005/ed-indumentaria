import { useEffect, useMemo, useRef, useState } from 'react';
import type { GRUPOS_DE_VENTA, LINEAS, SUBGRUPOS_DE_VENTA, TIPOS_DE_PAGO } from '@backend/types';
import type { Agrupacion, ArticuloDeVenta, ItemAConfirmar } from '@/types/ventas';
import BaseModal from '@/components/ui/BaseModal';
import Notificacion from '@/components/ui/Notificacion';
import { useNotificacion } from '@/hooks/useNotificacion';
import { useTablaServidor } from '@/components/tabla/useTablaServidor';
import { SIN_ASIGNAR_ID } from '@/components/tabla/tipos';
import type { OpcionFiltro } from '@/components/tabla/tipos';
import { mensajeDetallesPrimero } from '@/api/cliente';
import type { ParamsArticulosVenta } from '@/api/venta';
import {
  obtenerAgrupaciones,
  obtenerGruposDeCliente,
  obtenerSubgruposDeGrupo,
  listarArticulosVentaPagina,
  listarOpcionesColumnaVenta,
} from '@/api/venta';
import { listarLineas } from '@/api/agrupaciones';
import ColumnFilterModal from '@/components/tabla/ColumnFilterModal';
import MigasDePasos from '@/components/ui/MigasDePasos';
import ConfirmarProductoModal from '@/features/ventas/modales/ConfirmarProductoModal';
import { crearColumnasVenta } from './columnasVenta';
import PasoLinea from './PasoLinea';
import PasoCliente from './PasoCliente';
import { textoTodaLaAgrupacion } from './textos';
import PasoGrupo from './PasoGrupo';
import PasoTabla, { TAMANO_PAGINA } from './PasoTabla';

/** El paso se contesto salteando su filtro ("Todas las líneas", ...). */
const TODOS = 'todos';

// T va acotado a objeto para que TypeScript pueda descartar TODOS y null por
// comparacion: con un T libre no sabria que el resto es siempre la entidad.
/** null = el paso todavia no se contesto. */
type Seleccion<T extends object> = T | typeof TODOS | null;

/** El id que hay que mandar a la API, o null si el paso no acota nada. */
const idDe = <T extends object, K extends keyof T>(
  seleccion: Seleccion<T>,
  clave: K
): number | null =>
  seleccion === null || seleccion === TODOS ? null : (seleccion[clave] as number);

/** Lo que muestran las migas y los mensajes de ese paso. */
const textoDe = <T extends object, K extends keyof T>(
  seleccion: Seleccion<T>,
  clave: K,
  textoTodos: string
): string | undefined => {
  if (seleccion === null) return undefined;
  return seleccion === TODOS ? textoTodos : String(seleccion[clave]);
};

/**
 * Lo que se contesta en el paso 2 cuando SI se acota: un colegio o club
 * puntual, o una agrupacion entera ("todos los colegios"). Los dos viajan a la
 * API como un filtro distinto, por eso hace falta distinguirlos.
 */
type ClienteElegido =
  | { tipo: 'cliente'; id: number; nombre: string }
  | { tipo: 'agrupacion'; id: number; nombre: string };

interface AgregarProductoModalProps {
  abierto: boolean;
  onCerrar: () => void;
  articulosExcluidos: number[];
  /** Metodos de pago: la tabla muestra una columna de precio por cada uno. */
  metodos: TIPOS_DE_PAGO[];
  onAgregar: (articulo: ArticuloDeVenta, cantidad: number) => void;
}

export default function AgregarProductoModal({
  abierto,
  onCerrar,
  articulosExcluidos,
  metodos,
  onAgregar,
}: AgregarProductoModalProps) {
  // --- Seleccion del asistente ---
  // null = el paso todavia no se contesto; TODOS = se contesto salteando el
  // filtro. Los dos son "no hay id que mandar", pero solo el segundo deja
  // avanzar al paso siguiente.
  const [linea, setLinea] = useState<Seleccion<LINEAS>>(null);
  const [cliente, setCliente] = useState<Seleccion<ClienteElegido>>(null);
  const [grupo, setGrupo] = useState<Seleccion<GRUPOS_DE_VENTA>>(null);

  const idLinea = idDe(linea, 'id_linea');
  const idGrupo = idDe(grupo, 'id_grupo');

  // El paso 2 acota de tres formas y cada una es un filtro distinto de la API:
  // un colegio/club puntual, una agrupacion entera, o nada.
  const elegidoEnCliente = cliente === null || cliente === TODOS ? null : cliente;
  const idCliente = elegidoEnCliente?.tipo === 'cliente' ? elegidoEnCliente.id : null;
  const idAgrupacion = elegidoEnCliente?.tipo === 'agrupacion' ? elegidoEnCliente.id : null;

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

  // --- Paginacion (la tabla se pagina en la base) ---
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  // Opciones del filtro de seleccion abierto, marcadas con la columna y los
  // params con los que se pidieron.
  const [opciones, setOpciones] = useState<{
    columna: string;
    params: ParamsArticulosVenta;
    valores: OpcionFiltro[];
  } | null>(null);

  // --- Seleccion masiva ---
  // Se guarda el articulo ENTERO, no solo el id: al confirmar hay que mandar
  // los datos y con la tabla paginada los de otras paginas ya no estan cargados.
  const [seleccionadosPorId, setSeleccionadosPorId] = useState<Map<number, ArticuloDeVenta>>(
    new Map()
  );
  const seleccionados = useMemo(
    () => new Set(seleccionadosPorId.keys()),
    [seleccionadosPorId]
  );

  const toggleSeleccion = (id: number) => {
    setSeleccionadosPorId((prev) => {
      const siguiente = new Map(prev);
      if (siguiente.has(id)) siguiente.delete(id);
      else {
        const articulo = articulos.find((a) => a.id_articulo === id);
        if (articulo) siguiente.set(id, articulo);
      }
      return siguiente;
    });
  };

  // --- Confirmacion (click en una fila, su boton "Agregar", o el "Agregar"
  // masivo de la barra de seleccion). Soporta uno o varios productos a la vez.
  const [productosAConfirmar, setProductosAConfirmar] = useState<ArticuloDeVenta[] | null>(null);
  // Si la tanda a confirmar vino de la seleccion masiva: al confirmar hay que
  // limpiar esa seleccion. Si vino de un click individual, no hay que tocarla
  // (podria haber otros articulos seleccionados de fondo).
  const [confirmacionEsMasiva, setConfirmacionEsMasiva] = useState(false);
  const {
    notificacion,
    mostrar: mostrarNotificacion,
    ocultar: ocultarNotificacion,
  } = useNotificacion();

  const paso = linea === null ? 1 : cliente === null ? 2 : grupo === null ? 3 : 4;

  const volverAPaso = (destino: 1 | 2 | 3) => {
    setError(null);
    setGrupo(null);
    if (destino <= 2) setCliente(null);
    if (destino === 1) setLinea(null);
  };

  // Al abrirse arranca de cero y trae las lineas, que son el primer paso.
  useEffect(() => {
    if (!abierto) return;

    setLinea(null);
    setCliente(null);
    setGrupo(null);
    setError(null);
    setCargando(true);
    setSeleccionadosPorId(new Map());
    setPagina(1);
    ocultarNotificacion();

    listarLineas()
      .then((lineasData) => setLineas(lineasData))
      .catch((err) => {
        console.error('Error al obtener las lineas:', err);
        setError(mensajeDetallesPrimero(err, 'No se pudieron cargar las líneas.'));
      })
      .finally(() => setCargando(false));
    // ocultarNotificacion es estable (useCallback sin dependencias): no hace
    // que el efecto se vuelva a correr.
  }, [abierto, ocultarNotificacion]);

  // Paso 2: colegios/clubes con articulos vigentes de la linea elegida.
  useEffect(() => {
    if (linea === null) return;

    let cancelado = false;
    setCargando(true);

    obtenerAgrupaciones(idLinea)
      .then((data) => {
        if (cancelado) return;
        setAgrupaciones(data);
        setError(null);
      })
      .catch((err) => {
        if (cancelado) return;
        console.error('Error al obtener las agrupaciones:', err);
        setError(mensajeDetallesPrimero(err, 'No se pudieron cargar los colegios y clubes.'));
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [linea, idLinea]);

  // Paso 3: grupos que tienen articulos de este cliente en esta linea.
  useEffect(() => {
    if (linea === null || cliente === null) return;

    let cancelado = false;
    setCargando(true);

    obtenerGruposDeCliente(idCliente, idAgrupacion, idLinea)
      .then((data) => {
        if (cancelado) return;
        setGrupos(data);
        setError(null);
      })
      .catch((err) => {
        if (cancelado) return;
        console.error('Error al obtener los grupos:', err);
        setError(mensajeDetallesPrimero(err, 'No se pudieron cargar los grupos.'));
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [cliente, linea, idCliente, idAgrupacion, idLinea]);

  const textoLinea = textoDe(linea, 'nombre_linea', 'Todas las líneas');
  const textoCliente = textoDe(cliente, 'nombre', 'Todos los colegios y clubes');
  const textoGrupo = textoDe(grupo, 'nombre_grupo', 'Todos los grupos');

  const columnas = useMemo(() => crearColumnasVenta(lineas, metodos), [lineas, metodos]);

  // El metodo sin recargo cobra el precio base, que ya se muestra aparte
  // (mismo criterio que VentasPage/NuevaVentaModal).
  const metodosConRecargo = useMemo(() => metodos.filter((metodo) => metodo.recargo > 0), [metodos]);

  // La tabla se pagina, filtra y ordena EN LA BASE: con "Todos" en los tres
  // pasos son casi 7000 articulos y traerlos de una vez no escala. El hook solo
  // guarda el estado de los headers; la consulta la arma `params`.
  const tabla = useTablaServidor<ArticuloDeVenta>({
    columnas,
    opciones: opciones?.valores ?? [],
  });
  const { resetear: resetearTabla } = tabla;

  const params = useMemo<ParamsArticulosVenta>(
    () => ({
      busqueda,
      idLinea,
      idCliente,
      idAgrupacion,
      idGrupo,
      idSubgrupo: subgrupoSeleccionado,
      excluir: articulosExcluidos,
      filtros: tabla.filtrosColumna,
      orden: tabla.ordenColumnas,
    }),
    [
      busqueda,
      idLinea,
      idCliente,
      idAgrupacion,
      idGrupo,
      subgrupoSeleccionado,
      articulosExcluidos,
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

  // Paso 4: la pagina actual de articulos del recorte elegido.
  useEffect(() => {
    if (paso !== 4) return;

    const peticion = ++secuenciaPagina.current;
    setCargando(true);

    listarArticulosVentaPagina(params, pagina, TAMANO_PAGINA)
      .then((respuesta) => {
        if (peticion !== secuenciaPagina.current) return;
        setArticulos(respuesta.articulos);
        setTotal(respuesta.total);
        setError(null);
        // La pagina puede quedar fuera de rango al agregar articulos al carrito.
        const ultima = Math.max(1, Math.ceil(respuesta.total / TAMANO_PAGINA));
        if (pagina > ultima) setPagina(ultima);
      })
      .catch((err) => {
        if (peticion !== secuenciaPagina.current) return;
        console.error('Error al obtener los articulos:', err);
        setError(mensajeDetallesPrimero(err, 'No se pudieron cargar los artículos.'));
      })
      .finally(() => {
        if (peticion === secuenciaPagina.current) setCargando(false);
      });
  }, [paso, params, pagina]);

  // Los subgrupos del desplegable solo tienen sentido con un grupo concreto:
  // la base filtra por subgrupo unicamente dentro de un grupo.
  useEffect(() => {
    if (idGrupo === null) {
      setSubgrupos([]);
      return;
    }

    let cancelado = false;

    obtenerSubgruposDeGrupo(idGrupo)
      .then((data) => {
        if (!cancelado) setSubgrupos(data);
      })
      .catch((err) => console.error('Error al obtener los subgrupos:', err));

    return () => {
      cancelado = true;
    };
  }, [idGrupo]);

  // Al cambiar de recorte se arranca de cero: sin filtros, sin busqueda y sin
  // seleccion de la combinacion anterior.
  useEffect(() => {
    setSubgrupoSeleccionado(null);
    setBusqueda('');
    resetearTabla();
    setSeleccionadosPorId(new Map());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idCliente, idAgrupacion, idGrupo, idLinea]);

  // Opciones del filtro de seleccion recien abierto: las calcula el backend
  // sobre las filas que pasan todos los DEMAS filtros.
  const columnaAbierta = tabla.columnaAbierta;

  const columnaQueNecesitaOpciones =
    columnaAbierta && columnaAbierta.filtro?.tipo === 'seleccion' && !columnaAbierta.filtro.opcionesEstaticas
      ? columnaAbierta.filtroKey ?? null
      : null;

  // Hasta que las opciones sean las de ESTA columna con ESTOS filtros el modal
  // no abre: si no, mostraria por un instante las de la consulta anterior.
  const opcionesListas =
    columnaQueNecesitaOpciones === null ||
    (opciones !== null && opciones.columna === columnaQueNecesitaOpciones && opciones.params === params);

  const secuenciaOpciones = useRef(0);

  useEffect(() => {
    if (columnaQueNecesitaOpciones === null || opcionesListas) return;

    const peticion = ++secuenciaOpciones.current;

    listarOpcionesColumnaVenta(params, columnaQueNecesitaOpciones)
      .then(({ opciones: valores, haySinAsignar }) => {
        if (peticion !== secuenciaOpciones.current) return;
        setOpciones({
          columna: columnaQueNecesitaOpciones,
          params,
          valores: haySinAsignar ? [...valores, { id: SIN_ASIGNAR_ID, nombre: 'Sin asignar' }] : valores,
        });
      })
      .catch((err) => {
        if (peticion !== secuenciaOpciones.current) return;
        console.error('Error al obtener las opciones del filtro:', err);
        // Se guarda vacio bajo la misma marca para que el modal abra igual.
        setOpciones({ columna: columnaQueNecesitaOpciones, params, valores: [] });
      });
  }, [columnaQueNecesitaOpciones, opcionesListas, params]);

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
    if (confirmacionEsMasiva) setSeleccionadosPorId(new Map());
    mostrarNotificacion(
      items.length === 1
        ? `"${items[0].articulo.descripcion ?? 'Artículo'}" agregado a la venta.`
        : `${items.length} artículos agregados a la venta.`
    );
  };

  // El checkbox del header opera sobre la PAGINA visible, no sobre todo lo que
  // coincide con los filtros.
  const todosSeleccionados =
    articulos.length > 0 && articulos.every((a) => seleccionados.has(a.id_articulo));

  const handleSeleccionarTodos = () => {
    setSeleccionadosPorId((prev) => {
      const siguiente = new Map(prev);
      if (todosSeleccionados) {
        for (const articulo of articulos) siguiente.delete(articulo.id_articulo);
      } else {
        for (const articulo of articulos) siguiente.set(articulo.id_articulo, articulo);
      }
      return siguiente;
    });
  };

  // Abre el modal de confirmacion con todos los seleccionados, para poder
  // ajustar la cantidad de cada uno antes de agregarlos. Salen del mapa (no de
  // la pagina actual) para no perder los tildados en paginas anteriores.
  const handleAgregarSeleccionados = () => {
    const excluidos = new Set(articulosExcluidos);
    const paraConfirmar = [...seleccionadosPorId.values()].filter(
      (articulo) => !excluidos.has(articulo.id_articulo)
    );
    if (paraConfirmar.length === 0) return;

    setConfirmacionEsMasiva(true);
    setProductosAConfirmar(paraConfirmar);
  };

  const TITULO_POR_PASO: Record<number, string> = {
    1: 'Elegí una línea',
    2: 'Elegí un colegio o club',
    3: 'Elegí un grupo',
    4: 'Agregar Producto',
  };
  const tituloPaso = TITULO_POR_PASO[paso];

  return (
    <>
      <BaseModal
        abierto={abierto}
        onCerrar={onCerrar}
        titulo={tituloPaso}
        claseTitulo='text-lg font-medium leading-6 text-gray-900'
        ancho={paso === 4 ? '1200px' : '2xl'}
        z='z-[60]'
        clasePanel='relative select-none'
        error={error ? { titulo: 'Ocurrió un error', detalle: error } : null}
        footer={
          <button
            onClick={onCerrar}
            className='w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors cursor-pointer'
          >
            Cerrar
          </button>
        }
        encabezado={
          /* Avisa que se agrego un producto SIN cerrar el modal, asi se puede
             seguir agregando. */
          <Notificacion mensaje={notificacion} />
        }
        debajoDelTitulo={
          <>
            {/* Migas: muestran lo elegido y permiten volver atras */}
            {linea && (
              <MigasDePasos
                pasos={[
                  { clave: 'linea', texto: textoLinea, onClick: () => volverAPaso(1) },
                  ...(cliente
                    ? [
                        {
                          clave: 'cliente',
                          texto: textoCliente,
                          onClick: () => volverAPaso(2),
                        },
                      ]
                    : []),
                  ...(grupo
                    ? [
                        {
                          clave: 'grupo',
                          texto: textoGrupo,
                          onClick: () => volverAPaso(3),
                        },
                      ]
                    : []),
                ]}
              />
            )}

            {!linea && <div className='mb-4' />}
          </>
        }
      >
        {paso === 1 && (
          <PasoLinea
            lineas={lineas}
            cargando={cargando}
            onSeleccionar={setLinea}
            onSeleccionarTodas={() => setLinea(TODOS)}
          />
        )}

        {paso === 2 && (
          <PasoCliente
            agrupaciones={agrupaciones}
            cargando={cargando}
            nombreLinea={textoLinea}
            onSeleccionar={(c) => setCliente({ tipo: 'cliente', id: c.id_cliente, nombre: c.nombre })}
            onSeleccionarAgrupacion={(a) =>
              setCliente({
                tipo: 'agrupacion',
                id: a.id_grupo,
                nombre: textoTodaLaAgrupacion(a.nombre_grupo),
              })
            }
            onSeleccionarTodos={() => setCliente(TODOS)}
          />
        )}

        {paso === 3 && (
          <PasoGrupo
            grupos={grupos}
            cargando={cargando}
            nombreCliente={textoCliente}
            nombreLinea={textoLinea}
            onSeleccionar={setGrupo}
            onSeleccionarTodos={() => setGrupo(TODOS)}
          />
        )}

        {paso === 4 && (
          <PasoTabla
            tabla={tabla}
            columnas={columnas}
            articulos={articulos}
            pagina={pagina}
            total={total}
            onCambiarPagina={setPagina}
            subgrupos={subgrupos}
            subgrupoSeleccionado={subgrupoSeleccionado}
            onSubgrupoChange={setSubgrupoSeleccionado}
            busqueda={busqueda}
            onBusquedaChange={setBusqueda}
            cargando={cargando}
            seleccionados={seleccionados}
            onToggleSeleccion={toggleSeleccion}
            todosSeleccionados={todosSeleccionados}
            onToggleTodos={handleSeleccionarTodos}
            onDeseleccionar={() => setSeleccionadosPorId(new Map())}
            onAgregarSeleccionados={handleAgregarSeleccionados}
            onAgregar={handleAgregar}
          />
        )}
      </BaseModal>

      <ColumnFilterModal
        abierto={tabla.columnaFiltroAbierta !== null && opcionesListas}
        onCerrar={() => tabla.setColumnaFiltroAbierta(null)}
        titulo={tabla.columnaAbierta?.header ?? ''}
        z='z-[70]'
        tipo={tabla.columnaAbierta?.filtro.tipo ?? null}
        filtroActual={
          tabla.columnaFiltroAbierta ? tabla.filtrosColumna[tabla.columnaFiltroAbierta] : undefined
        }
        opciones={tabla.opcionesFiltroAbierto}
        onAplicar={(filtro) => {
          tabla.handleAplicarFiltro(filtro);
          tabla.setColumnaFiltroAbierta(null);
        }}
      />

      <ConfirmarProductoModal
        abierto={productosAConfirmar !== null}
        productos={productosAConfirmar}
        metodosConRecargo={metodosConRecargo}
        onCerrar={() => setProductosAConfirmar(null)}
        onConfirmar={handleConfirmarProductos}
      />
    </>
  );
}
