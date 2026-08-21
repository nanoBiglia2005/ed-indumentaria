import type { SUBGRUPOS_DE_VENTA } from '@backend/types';
import type { ArticuloDeVenta } from '@/types/ventas';
import type { ColumnaTabla } from '@/components/tabla/tipos';
import DataGrid from '@/components/tabla/DataGrid';
import type { useTablaServidor } from '@/components/tabla/useTablaServidor';
import Paginador from '@/components/tabla/Paginador';
import SearchInput from '@/components/ui/SearchInput';
import InlineFilterDropdown from '@/components/ui/InlineFilterDropdown';
import { ALTO_LINEA, MAX_LINEAS_CELDA, ROW_HEIGHT, ANCHO_COL_SELECCION } from './columnasVenta';

type Tabla = ReturnType<typeof useTablaServidor<ArticuloDeVenta>>;

/** Cuantos articulos trae cada pagina (lo mismo que la tabla de Articulos). */
export const TAMANO_PAGINA = 30;

/** Paso 3 del wizard: tabla de articulos disponibles, con filtros y seleccion. */
interface PasoTablaProps {
  tabla: Tabla;
  columnas: ColumnaTabla<ArticuloDeVenta>[];
  /** Solo la pagina actual: el resto vive en la base. */
  articulos: ArticuloDeVenta[];
  pagina: number;
  /** Cuantos coinciden con los filtros, para el paginador. */
  total: number;
  onCambiarPagina: (pagina: number) => void;
  subgrupos: SUBGRUPOS_DE_VENTA[];
  subgrupoSeleccionado: number | null;
  onSubgrupoChange: (id: number | null) => void;
  busqueda: string;
  onBusquedaChange: (valor: string) => void;
  cargando: boolean;
  seleccionados: Set<number>;
  onToggleSeleccion: (id: number) => void;
  todosSeleccionados: boolean;
  onToggleTodos: () => void;
  onDeseleccionar: () => void;
  onAgregarSeleccionados: () => void;
  onAgregar: (articulo: ArticuloDeVenta) => void;
}

export default function PasoTabla({
  tabla,
  columnas,
  articulos,
  pagina,
  total,
  onCambiarPagina,
  subgrupos,
  subgrupoSeleccionado,
  onSubgrupoChange,
  busqueda,
  onBusquedaChange,
  cargando,
  seleccionados,
  onToggleSeleccion,
  todosSeleccionados,
  onToggleTodos,
  onDeseleccionar,
  onAgregarSeleccionados,
  onAgregar,
}: PasoTablaProps) {
  return (
    <>
      <div className='flex flex-wrap items-center gap-2 mb-3'>
        {/* Sin un grupo concreto la base no filtra por subgrupo, asi que el
            desplegable no se ofrece: para eso esta el filtro de la columna. */}
        {subgrupos.length > 0 && (
          <InlineFilterDropdown
            label='Filtrar por Subgrupo'
            conBuscador
            opciones={subgrupos.map((s) => ({ id: s.id_subgrupo, nombre: s.nombre_subgrupo }))}
            selectedId={subgrupoSeleccionado}
            onSelect={onSubgrupoChange}
            onClear={() => onSubgrupoChange(null)}
            disabled={cargando}
          />
        )}

        <SearchInput
          valor={busqueda}
          onCambio={onBusquedaChange}
          placeholder='Buscar artículo...'
          claseContenedor='relative flex-1 min-w-[180px] flex items-center'
        />
      </div>

      <DataGrid<ArticuloDeVenta>
        filas={articulos}
        columnas={columnas}
        keyDe={(item) => item.id_articulo}
        altoFila={ROW_HEIGHT}
        anchoColSeleccion={ANCHO_COL_SELECCION}
        anchoUltimaColumna='minmax(100px, 1fr)'
        claseContenedor='max-h-96 overflow-auto border rounded-md border-black/30'
        estiloCeldaTexto={{
          display: '-webkit-box',
          WebkitLineClamp: MAX_LINEAS_CELDA,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          // El line-height va explicito porque ROW_HEIGHT se calculo con el:
          // sin esto el navegador usa el heredado (1.5) y MAX_LINEAS_CELDA
          // lineas no entran en la altura fija que reserva la virtualizacion.
          lineHeight: `${ALTO_LINEA}px`,
          minWidth: 0,
        }}
        compacta
        filtrosColumna={tabla.filtrosColumna}
        ordenColumnas={tabla.ordenColumnas}
        onClickHeader={tabla.handleClickHeader}
        onClickOrdenar={tabla.handleClickOrdenar}
        busqueda={busqueda}
        seleccionados={seleccionados}
        onToggleSeleccion={onToggleSeleccion}
        todosSeleccionados={todosSeleccionados}
        onToggleTodos={onToggleTodos}
        toolbarSeleccion={
          <>
            <span className='text-white text-[13px] font-semibold whitespace-nowrap pr-1'>
              {seleccionados.size} {seleccionados.size === 1 ? 'seleccionado' : 'seleccionados'}
            </span>
            <button
              type='button'
              onClick={onDeseleccionar}
              className='rounded border border-white/70 px-3 py-1 text-[13px] font-semibold text-white cursor-pointer transition-colors duration-100 ease-in hover:bg-violet-600 whitespace-nowrap'
            >
              Deseleccionar
            </button>
            <button
              type='button'
              onClick={onAgregarSeleccionados}
              className='rounded border border-green-600 bg-green-600 px-3 py-1 text-[13px] font-semibold text-white cursor-pointer transition-colors duration-100 ease-in hover:bg-green-700 whitespace-nowrap'
            >
              Agregar
            </button>
          </>
        }
        onFilaClick={onAgregar}
        renderAccion={(item) => (
          <button
            type='button'
            onClick={(e) => {
              e.stopPropagation();
              onAgregar(item);
            }}
            className='rounded border border-violet-500 bg-violet-500 px-3 py-1 text-xs font-semibold text-white cursor-pointer transition-color duration-100 ease-in hover:bg-violet-600 active:bg-violet-700'
          >
            Agregar
          </button>
        )}
        claseCeldaAccion={() =>
          'py-2 border-black/20 border-l border-b group-hover:bg-amber-50 transition-color duration-100 ease-in flex items-center justify-center'
        }
        cargando={cargando}
        estadoCargando={<p className='px-3 py-6 text-sm text-gray-400 text-center'>Cargando artículos...</p>}
        estadoVacio={
          <p className='px-3 py-6 text-sm text-gray-400 italic text-center'>
            No hay artículos disponibles para agregar.
          </p>
        }
      />

      <Paginador
        pagina={pagina}
        tamano={TAMANO_PAGINA}
        total={total}
        cargando={cargando}
        onCambiarPagina={onCambiarPagina}
      />
    </>
  );
}
