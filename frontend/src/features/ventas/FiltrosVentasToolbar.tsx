import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import BotonFiltroVentas from './BotonFiltroVentas';
import ColumnFilterModal from '@/components/tabla/ColumnFilterModal';
import { esFiltrable } from '@/components/tabla/tipos';
import { etiquetaDeFiltroFecha } from '@/components/tabla/presetsFecha';
import type {
  ColumnaFiltrable,
  ColumnaTabla,
  CriterioOrden,
  FiltroColumna,
  OpcionFiltro,
} from '@/components/tabla/tipos';

/**
 * Barra de filtro/orden de Ventas/Historial: mismo motor y misma interaccion
 * que los headers de columna de DataGrid (useTablaServidor + ColumnFilterModal,
 * reusados tal cual), pero en fila arriba de la lista de RemitoCard en vez de
 * headers de una grilla — no hay columnas de tabla que mostrar, asi que el
 * boton en si (BotonFiltroVentas) tiene un look propio que dialoga con
 * RemitoCard en vez de reusar la estetica de spreadsheet de BotonFiltroOrden.
 *
 * Debajo de `md` (mismo corte que usa RemitoCard para su layout compacto) la
 * fila entera se colapsa a un unico boton "Filtros" que abre un Popover con los
 * mismos botones apilados: seis chips de ancho medido no entran en un celular.
 */
interface FiltrosVentasToolbarProps<T> {
  campos: ColumnaTabla<T>[];
  /**
   * Ancho (px) por campo, keyeado por `filtroKey` — el mismo que usa
   * RemitoCard para sus columnas (ver ListaDeRemitos / MedidorAnchosRemitoCard):
   * cada boton queda tan ancho como la columna que filtra, como si fuese su
   * cabecera.
   */
  filtrosColumna: Record<string, FiltroColumna>;
  ordenColumnas: CriterioOrden[];
  onClickHeader: (columna: ColumnaTabla<T>) => void;
  onClickOrdenar: (columna: ColumnaTabla<T>, event: React.MouseEvent) => void;
  columnaAbierta: ColumnaFiltrable<T> | null;
  opcionesFiltroAbierto: OpcionFiltro[];
  /**
   * false mientras se piden al backend las opciones de un filtro de seleccion
   * recien abierto (ver useOpcionesDeFiltro): el modal no se abre todavia,
   * para no mostrar por un instante las opciones de la consulta anterior.
   * Siempre true para filtros con `opcionesEstaticas` (Estado).
   */
  opcionesListas: boolean;
  onCerrarFiltro: () => void;
  onAplicarFiltro: (filtro: FiltroColumna | null) => void;
}

export default function FiltrosVentasToolbar<T>({
  campos,
  filtrosColumna,
  ordenColumnas,
  onClickHeader,
  onClickOrdenar,
  columnaAbierta,
  opcionesFiltroAbierto,
  opcionesListas,
  onCerrarFiltro,
  onAplicarFiltro,
}: FiltrosVentasToolbarProps<T>) {
  const filtrables = campos.filter(esFiltrable);
  const cantidadFiltrosActivos = filtrables.filter((campo) => filtrosColumna[campo.filtroKey]).length;

  /**
   * El mismo boton en los dos layouts. `ancho` solo se pasa en la fila de
   * escritorio: dentro del Popover el boton no es la cabecera de ninguna
   * columna, asi que ahi ocupa todo el ancho del panel.
   */
  const renderBoton = (campo: ColumnaFiltrable<T>, alClickear?: () => void) => {
    const filtroActivo = filtrosColumna[campo.filtroKey];
    const prioridadOrden = ordenColumnas.findIndex((c) => c.key === campo.filtroKey);
    const ordenActivo = prioridadOrden === -1 ? null : ordenColumnas[prioridadOrden].direccion;
    // Un filtro de fecha activo muestra QUE se esta filtrando (el
    // preset elegido, o el rango) en vez del nombre de la columna.
    const texto = filtroActivo?.tipo === 'fecha' ? etiquetaDeFiltroFecha(filtroActivo) : undefined;
    return (
      <BotonFiltroVentas
        key={campo.header}
        columna={campo}
        texto={texto}
        filtroActivo={Boolean(filtroActivo)}
        ordenActivo={ordenActivo}
        prioridadOrden={prioridadOrden}
        totalCriterios={ordenColumnas.length}
        onClickHeader={(columna) => {
          alClickear?.();
          onClickHeader(columna);
        }}
        onClickOrdenar={onClickOrdenar}
      />
    );
  };

  return (
    <>
      {/* Escritorio: cada boton alineado como cabecera de su columna. */}
      <div className='hidden lg:flex flex-wrap gap-3 mb-2 shrink-0'>
        {filtrables.map((campo) => renderBoton(campo))}
      </div>

      {/* Celular: un solo boton "Filtros" con los mismos botones apilados. */}
      <div className='lg:hidden mb-2 shrink-0'>
        <Popover className='relative'>
          <PopoverButton
            className={`flex items-center gap-2 rounded border px-3 py-2 text-sm font-medium cursor-pointer transition-colors duration-100 ease-in focus:outline-none ${
              cantidadFiltrosActivos > 0
                ? 'bg-marca-500 border-marca-500 text-white hover:bg-marca-600'
                : 'bg-white border-neutro-200 text-neutro-600 hover:bg-neutro-100 hover:text-neutro-900'
            }`}
          >
            <svg
              className={`h-3.5 w-3.5 shrink-0 ${cantidadFiltrosActivos > 0 ? 'text-white' : 'text-neutro-400'}`}
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
            Filtros
            {cantidadFiltrosActivos > 0 && (
              <span className='flex items-center justify-center h-4 w-4 shrink-0 rounded-full bg-white text-marca-600 text-[10px] font-bold leading-none'>
                {cantidadFiltrosActivos}
              </span>
            )}
          </PopoverButton>

          {/* shadow-sm: excepcion documentada para elementos flotantes. */}
          <PopoverPanel className='absolute z-20 mt-1 w-64 max-w-[85vw] rounded border border-neutro-200 bg-white p-2 shadow-sm focus:outline-none'>
            {({ close }) => (
              <div className='flex flex-col gap-2'>
                {/* Elegir un filtro abre el modal: el panel se cierra para no
                    quedar flotando detras. Ordenar no lo cierra (se pueden
                    apilar varios criterios de una). */}
                {filtrables.map((campo) => renderBoton(campo, close))}
              </div>
            )}
          </PopoverPanel>
        </Popover>
      </div>

      <ColumnFilterModal
        abierto={columnaAbierta !== null && opcionesListas}
        onCerrar={onCerrarFiltro}
        titulo={columnaAbierta?.header ?? ''}
        tipo={columnaAbierta?.filtro.tipo ?? null}
        filtroActual={columnaAbierta ? filtrosColumna[columnaAbierta.filtroKey] : undefined}
        opciones={opcionesFiltroAbierto}
        soportaModoExcluyente={
          columnaAbierta?.filtro.tipo === 'seleccion' ? columnaAbierta.filtro.soportaModoExcluyente : undefined
        }
        onAplicar={onAplicarFiltro}
      />
    </>
  );
}
