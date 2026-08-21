import { useEffect, useMemo, useRef, useState } from 'react';
import type { GRUPOS_DE_VENTA, LINEAS, SUBGRUPOS_DE_VENTA, TIPOS_DE_PAGO } from '@backend/types';
import type { Agrupacion, ArticuloDeVenta, ClienteVenta, ItemAConfirmar } from '@/types/ventas';
import BaseModal from '@/components/ui/BaseModal';
import { useTablaFiltrable } from '@/components/tabla/useTablaFiltrable';
import { useToggleSet } from '@/hooks/useToggleSet';
import { normalizarBusqueda } from '@/utils/texto';
import { mensajeDetallesPrimero } from '@/api/cliente';
import { obtenerAgrupaciones, obtenerGruposDeCliente, obtenerArticulosDeVenta } from '@/api/venta';
import { listarLineas } from '@/api/agrupaciones';
import ColumnFilterModal from '@/components/tabla/ColumnFilterModal';
import MigasDePasos from '@/components/ui/MigasDePasos';
import ConfirmarProductoModal from '@/features/ventas/modales/ConfirmarProductoModal';
import { crearColumnasVenta, desempateTalleVenta } from './columnasVenta';
import PasoCliente from './PasoCliente';
import PasoGrupo from './PasoGrupo';
import PasoTabla from './PasoTabla';

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

  // --- Seleccion masiva ---
  const { seleccionados, toggle: toggleSeleccion, setSeleccionados } = useToggleSet<number>();

  // --- Confirmacion (click en una fila, su boton "Agregar", o el "Agregar"
  // masivo de la barra de seleccion). Soporta uno o varios productos a la vez.
  const [productosAConfirmar, setProductosAConfirmar] = useState<ArticuloDeVenta[] | null>(null);
  // Si la tanda a confirmar vino de la seleccion masiva: al confirmar hay que
  // limpiar esa seleccion. Si vino de un click individual, no hay que tocarla
  // (podria haber otros articulos seleccionados de fondo).
  const [confirmacionEsMasiva, setConfirmacionEsMasiva] = useState(false);
  const [notificacion, setNotificacion] = useState<string | null>(null);

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
    if (!abierto) return;

    setCliente(null);
    setGrupo(null);
    setError(null);
    setCargando(true);
    setSeleccionados(new Set());
    setNotificacion(null);

    Promise.all([obtenerAgrupaciones(), listarLineas()])
      .then(([agrupacionesData, lineasData]) => {
        setAgrupaciones(agrupacionesData);
        setLineas(lineasData);
      })
      .catch((err) => {
        console.error('Error al obtener las agrupaciones:', err);
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los datos.');
      })
      .finally(() => setCargando(false));
  }, [abierto, setSeleccionados]);

  // Paso 2: grupos que tienen articulos de este cliente.
  useEffect(() => {
    if (cliente === null) return;

    let cancelado = false;
    setCargando(true);

    obtenerGruposDeCliente(cliente.id_cliente)
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
  }, [cliente]);

  const columnas = useMemo(() => crearColumnasVenta(lineas, metodos), [lineas, metodos]);

  // El metodo sin recargo cobra el precio base, que ya se muestra aparte
  // (mismo criterio que VentasPage/NuevaVentaModal).
  const metodosConRecargo = useMemo(() => metodos.filter((metodo) => metodo.recargo > 0), [metodos]);

  // Filas base: se excluyen los ya agregados a la venta y se aplican el
  // subgrupo elegido y la busqueda global. Los filtros por columna y el orden
  // los maneja useTablaFiltrable.
  const articulosBase = useMemo(() => {
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

    return resultado;
  }, [articulos, articulosExcluidos, subgrupoSeleccionado, busqueda, columnas]);

  const tabla = useTablaFiltrable({
    filas: articulosBase,
    columnas,
    desempate: desempateTalleVenta,
    // Las opciones de los filtros salen de TODOS los articulos cargados.
    filasParaOpciones: articulos,
  });
  const { resetear: resetearTabla } = tabla;

  // Paso 3: solo los articulos que estan en el cliente Y en el grupo.
  useEffect(() => {
    if (cliente === null || grupo === null) return;

    let cancelado = false;
    setCargando(true);
    setSubgrupoSeleccionado(null);
    setBusqueda('');
    resetearTabla();
    setSeleccionados(new Set());

    obtenerArticulosDeVenta(cliente.id_cliente, grupo.id_grupo)
      .then((data) => {
        if (cancelado) return;
        setArticulos(data.articulos);
        setSubgrupos(data.subgrupos);
        setError(null);
      })
      .catch((err) => {
        if (cancelado) return;
        console.error('Error al obtener los articulos:', err);
        setError(mensajeDetallesPrimero(err, 'No se pudieron cargar los artículos.'));
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente, grupo]);

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

  const articulosFiltrados = tabla.filasVisibles;

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
    <>
      <BaseModal
        abierto={abierto}
        onCerrar={onCerrar}
        titulo={tituloPaso}
        claseTitulo='text-lg font-medium leading-6 text-gray-900'
        ancho={paso === 3 ? '5xl' : '2xl'}
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
          <>
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
          </>
        }
        debajoDelTitulo={
          <>
            {/* Migas: muestran lo elegido y permiten volver atras */}
            {cliente && (
              <MigasDePasos
                pasos={[
                  { clave: 'cliente', texto: cliente.nombre, onClick: () => volverAPaso(1) },
                  ...(grupo
                    ? [
                        {
                          clave: 'grupo',
                          texto: grupo.nombre_grupo,
                          onClick: () => volverAPaso(2),
                        },
                      ]
                    : []),
                ]}
              />
            )}

            {!cliente && <div className='mb-4' />}
          </>
        }
      >
        {paso === 1 && (
          <PasoCliente agrupaciones={agrupaciones} cargando={cargando} onSeleccionar={setCliente} />
        )}

        {paso === 2 && (
          <PasoGrupo
            grupos={grupos}
            cargando={cargando}
            nombreCliente={cliente?.nombre}
            onSeleccionar={setGrupo}
          />
        )}

        {paso === 3 && (
          <PasoTabla
            tabla={tabla}
            columnas={columnas}
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
            onDeseleccionar={() => setSeleccionados(new Set())}
            onAgregarSeleccionados={handleAgregarSeleccionados}
            onAgregar={handleAgregar}
          />
        )}
      </BaseModal>

      <ColumnFilterModal
        abierto={tabla.columnaFiltroAbierta !== null}
        onCerrar={() => tabla.setColumnaFiltroAbierta(null)}
        titulo={tabla.columnaAbierta ? `Filtrar por ${tabla.columnaAbierta.header}` : ''}
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
