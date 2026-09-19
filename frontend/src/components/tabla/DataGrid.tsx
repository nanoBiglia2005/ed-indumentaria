import { useEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { resaltarCoincidencia } from '@/utils/texto';
import { useEsPantallaChica } from '@/hooks/useEsPantallaChica';
import BotonFiltroOrden from './BotonFiltroOrden';
import type { ColumnaTabla, CriterioOrden, FiltroColumna } from './tipos';

// Diferencia de padding vertical entre py-3 (12px, escritorio) y py-2 (8px,
// celular) en las DOS caras de la celda: es lo que hay que restarle a
// `altoFila` para que la fila realmente se achique por debajo de "md" — la
// altura de fila es un pixel fijo (la usa el virtualizador para todo el
// calculo de scroll), asi que si no se ajusta aca el padding mas chico de los
// <p> no cambia nada: el grid igual estira la celda a la altura de la fila.
const REDUCCION_ALTO_FILA_PANTALLA_CHICA = 8;

/**
 * Grilla virtualizada de articulos: header con filtro/orden por columna,
 * columna de seleccion con barra de acciones, celdas con line-clamp y
 * resaltado de busqueda, y una columna de accion final.
 *
 * El motor de filtros/orden vive en useTablaFiltrable; este componente solo
 * renderiza. `compacta` alterna entre los paddings de ArticulosPage (false)
 * y los del modal de venta (true).
 */
interface DataGridProps<T> {
  filas: T[];
  columnas: ColumnaTabla<T>[];
  keyDe: (fila: T) => number;
  altoFila: number;
  anchoColSeleccion: number;
  /** Ultima celda del grid-template (p. ej. 'minmax(110px, 1fr)'). */
  anchoUltimaColumna: string;
  /** Clases del contenedor con scroll (alto/bordes segun el contexto). */
  claseContenedor: string;
  /** Estilo del <span> de texto de las celdas (line-clamp de cada tabla). */
  estiloCeldaTexto: CSSProperties;
  compacta?: boolean;

  // --- Motor (useTablaFiltrable) ---
  filtrosColumna: Record<string, FiltroColumna>;
  ordenColumnas: CriterioOrden[];
  onClickHeader: (columna: ColumnaTabla<T>) => void;
  onClickOrdenar: (columna: ColumnaTabla<T>, event: React.MouseEvent) => void;

  // --- Resaltado ---
  busqueda: string;
  /** true: el filtro de texto de la columna pisa a la busqueda global (ArticulosPage). */
  resaltarPorFiltroColumna?: boolean;

  // --- Seleccion ---
  seleccionados: Set<number>;
  onToggleSeleccion: (id: number) => void;
  todosSeleccionados: boolean;
  onToggleTodos: () => void;
  /** Contenido de la barra violeta que aparece con la seleccion activa. */
  toolbarSeleccion: ReactNode;
  /** true: las celdas de la fila seleccionada se pintan de neutro (ArticulosPage). */
  resaltarFilaSeleccionada?: boolean;

  // --- Columna de accion ---
  renderAccion: (fila: T) => ReactNode;
  claseCeldaAccion: (fila: T) => string;

  // --- Fila ---
  onFilaClick?: (fila: T) => void;
  /**
   * Marca una fila "en alerta". Si devuelve un texto, la fila recibe
   * `data-alerta` (las celdas se pintan con bordes rojos y un tinte `red-50`;
   * hover y seleccion pasan a `red-100` / `red-200`) y ese texto va como
   * `title` de la fila. La grilla NO sabe por que una fila esta en alerta: la
   * regla (p. ej. "cantidad por debajo del minimo") la decide quien la usa.
   * Quien pase `claseCeldaAccion` tiene que sumar las mismas clases
   * `group-data-[alerta]:*` a su celda para que quede pintada como el resto.
   */
  alertaFila?: (fila: T) => string | null;
  /**
   * Marca una fila "deshabilitada" (p. ej. sin stock): recibe `data-deshabilitada`
   * y sus celdas se pintan `neutro-200` (tambien en hover) con `cursor-not-allowed`.
   * La grilla NO decide que significa "deshabilitada" ni bloquea el click: sigue
   * llamando a `onFilaClick`/`onToggleSeleccion` igual, para que quien la usa
   * pueda avisar por que no se puede (ver AgregarProductoModal).
   */
  filaDeshabilitada?: (fila: T) => boolean;

  // --- Estados ---
  cargando?: boolean;
  estadoCargando?: ReactNode;
  estadoVacio: ReactNode;
}

export default function DataGrid<T>({
  filas,
  columnas,
  keyDe,
  altoFila,
  anchoColSeleccion,
  anchoUltimaColumna,
  claseContenedor,
  estiloCeldaTexto,
  compacta = false,
  filtrosColumna,
  ordenColumnas,
  onClickHeader,
  onClickOrdenar,
  busqueda,
  resaltarPorFiltroColumna = false,
  seleccionados,
  onToggleSeleccion,
  todosSeleccionados,
  onToggleTodos,
  toolbarSeleccion,
  resaltarFilaSeleccionada = false,
  renderAccion,
  claseCeldaAccion,
  onFilaClick,
  alertaFila,
  filaDeshabilitada,
  cargando = false,
  estadoCargando = null,
  estadoVacio,
}: DataGridProps<T>) {
  const scrollParentRef = useRef<HTMLDivElement>(null);

  const gridTemplateColumns = `${anchoColSeleccion}px ${columnas
    .map((c) => `${c.width}px`)
    .join(' ')} ${anchoUltimaColumna}`;

  // La de Articulos (compacta = false) tambien achica la fila por debajo de
  // "md", para que el padding mas chico de las celdas realmente se note: sin
  // esto, el grid igual estira cada <p> a `altoFila` (fijo) y el padding
  // menor solo deja mas espacio vacio arriba/abajo del texto.
  const esPantallaChica = useEsPantallaChica();
  const alturaFilaEfectiva =
    !compacta && esPantallaChica ? altoFila - REDUCCION_ALTO_FILA_PANTALLA_CHICA : altoFila;

  const rowVirtualizer = useVirtualizer({
    count: filas.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => alturaFilaEfectiva,
    overscan: 10,
  });

  // El memo interno de measurements de TanStack Virtual no incluye
  // `estimateSize` entre sus dependencias: sin este remeasure explicito, al
  // cruzar el breakpoint la fila seguiria calculandose con la altura vieja
  // hasta que cambiara alguna otra cosa (p. ej. la cantidad de filas).
  useEffect(() => {
    rowVirtualizer.measure();
  }, [alturaFilaEfectiva, rowVirtualizer]);

  const modoSeleccion = seleccionados.size > 0;

  // Paddings historicos de cada tabla. La de Articulos (compacta = false) los
  // achica por debajo de "md" (mismo corte que Layout pasa a flex-col): mobile-first,
  // asi que el valor sin prefijo es el chico y "md:" pisa con el grande.
  const pyHeader = compacta ? 'py-2' : 'py-2 md:py-3';
  const claseBtnFiltro = compacta ? 'py-2 pl-3 pr-1 gap-1' : 'py-2 pl-3 pr-1 gap-1 md:py-3 md:pl-4 md:pr-1.5 md:gap-1.5';
  const claseBtnOrden = compacta ? 'py-2 pl-1.5 pr-1' : 'py-2 pl-1.5 pr-1 md:py-3 md:pl-2 md:pr-1';
  const claseHeaderAccion = compacta ? 'py-2 px-3' : 'py-2 px-3 md:py-3 md:px-4';
  const claseCelda = compacta ? 'py-2 px-3' : 'py-2 px-3 md:py-3 md:px-4';

  // Fila en alerta (`data-alerta` en el <div> de la fila): las celdas heredan
  // los bordes rojos y el fondo del hover via `group-data-[alerta]`. Las
  // variantes apiladas (alerta + hover) tienen mas especificidad que
  // `group-hover:bg-neutro-100`, por eso ganan sin necesidad de `!important`.
  const claseCeldaAlerta =
    'group-data-[alerta]:border-red-400 group-data-[alerta]:group-hover:bg-red-200';
  const claseCeldaSeleccionada = 'bg-neutro-200 group-data-[alerta]:bg-red-300';

  // A diferencia de la alerta (que se apoya en que las celdas son
  // transparentes y dejan ver el `bg-red-100` de la fila), aca el gris se pinta
  // en CADA celda: alguna columna (p. ej. "Precio", con su propia tarjeta
  // blanca via renderCell) no es transparente, y depender del fondo de la fila
  // dejaba ese hueco sin pintar hasta pasar el mouse. Con el mismo tono en
  // reposo y en hover, tampoco hace falta la variante `group-hover` aparte.
  // El hover-plano tiene la MISMA especificidad que el data-attribute plano (un
  // empate que el orden de generacion de Tailwind podria resolver para
  // cualquier lado): se repite la regla combinada con `:group-hover` para
  // ganarle siempre, igual que hace `claseCeldaAlerta` con el rojo.
  const claseCeldaDeshabilitada =
    'group-data-[deshabilitada]:cursor-not-allowed group-data-[deshabilitada]:bg-neutro-200 group-data-[deshabilitada]:group-hover:bg-neutro-200';

  return (
    <div ref={scrollParentRef} className={claseContenedor}>
      <div
        className='grid text-black sticky top-0 z-10 isolate will-change-transform'
        style={{ gridTemplateColumns, transform: 'translateZ(0)' }}
      >
        <span
          className={`${pyHeader} border-black/35 bg-neutro-100 border-b flex items-center justify-center ${
            modoSeleccion ? 'bg-marca-500' : ''
          }`}
        >
          <input
            type='checkbox'
            checked={todosSeleccionados}
            onChange={onToggleTodos}
            title={todosSeleccionados ? 'Deseleccionar todos' : 'Seleccionar todos'}
            className='h-4 w-4 accent-marca-400 cursor-pointer'
          />
        </span>

        {modoSeleccion ? (
          <div
            className='border-black/35 bg-marca-500 border-b border-l overflow-hidden'
            style={{ gridColumn: '2 / -1' }}
          >
            <div className='sticky w-fit flex items-center gap-2 px-3 py-2'>{toolbarSeleccion}</div>
          </div>
        ) : (
          <>
            {columnas.map((columna) => {
              // Columna de solo lectura (valor derivado): header plano, sin los
              // botones de filtrar ni de ordenar.
              if (columna.filtroKey === undefined) {
                return (
                  <span
                    key={columna.header}
                    className={`${claseBtnFiltro} border-black/35 bg-neutro-100 text-[13px] font-medium border-b border-l flex items-center`}
                    title={`${columna.header} (no se puede filtrar ni ordenar)`}
                  >
                    <span className='flex-1 truncate'>{columna.header}</span>
                  </span>
                );
              }

              const filtroActivo = filtrosColumna[columna.filtroKey];
              const prioridadOrden = ordenColumnas.findIndex((c) => c.key === columna.filtroKey);
              const ordenActivo = prioridadOrden === -1 ? null : ordenColumnas[prioridadOrden].direccion;
              return (
                <BotonFiltroOrden
                  key={columna.header}
                  columna={columna}
                  filtroActivo={Boolean(filtroActivo)}
                  ordenActivo={ordenActivo}
                  prioridadOrden={prioridadOrden}
                  totalCriterios={ordenColumnas.length}
                  onClickHeader={onClickHeader}
                  onClickOrdenar={onClickOrdenar}
                  claseBtnFiltro={claseBtnFiltro}
                  claseBtnOrden={claseBtnOrden}
                />
              );
            })}
            <span
              className={`${claseHeaderAccion} border-black/35 bg-neutro-100 border-b border-l text-[13px] font-medium flex items-center justify-center`}
            >
              Acción
            </span>
          </>
        )}
      </div>

      {cargando && estadoCargando}

      {!cargando && filas.length === 0 && estadoVacio}

      {!cargando && (
        <div style={{ position: 'relative', height: rowVirtualizer.getTotalSize() }}>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const item = filas[virtualRow.index];
            const id = keyDe(item);
            const seleccionada = seleccionados.has(id);
            const alerta = alertaFila ? alertaFila(item) : null;
            const deshabilitada = filaDeshabilitada ? filaDeshabilitada(item) : false;
            return (
              <div
                key={id}
                onClick={onFilaClick ? () => onFilaClick(item) : undefined}
                data-alerta={alerta === null ? undefined : ''}
                data-deshabilitada={deshabilitada ? '' : undefined}
                title={alerta ?? undefined}
                className={`grid text-black text-xs group absolute top-0 left-0${
                  // Sin w-full a proposito: el header tampoco lo tiene y por
                  // eso su ancho crece con el contenido (suma de columnas,
                  // mas ancho que el contenedor visible). Con w-full la caja
                  // de la fila quedaba mas angosta que sus propias columnas
                  // (que igual se pintan, via overflow visible) y el fondo de
                  // alerta se cortaba antes de llegar a las ultimas.
                  deshabilitada ? ' cursor-not-allowed' : onFilaClick ? ' cursor-pointer' : ''
                }${alerta !== null ? ' bg-red-100' : deshabilitada ? ' bg-neutro-200' : ''}`}
                style={{
                  gridTemplateColumns,
                  height: alturaFilaEfectiva,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <label
                  onClick={onFilaClick ? (e) => e.stopPropagation() : undefined}
                  className={`${pyHeader} border-black/20 border-b flex items-center justify-center cursor-pointer group-hover:bg-neutro-100 transition-colors duration-100 ease-in ${claseCeldaAlerta} ${claseCeldaDeshabilitada} ${
                    seleccionada ? claseCeldaSeleccionada : ''
                  }`}
                >
                  <input
                    type='checkbox'
                    checked={seleccionada}
                    onChange={() => onToggleSeleccion(id)}
                    className='h-4 w-4 accent-marca-600 cursor-pointer'
                  />
                </label>
                {columnas.map((columna) => {
                  const valorTexto = String(columna.render(item) ?? '');
                  const filtroTextoColumna =
                    columna.filtroKey === undefined ? undefined : filtrosColumna[columna.filtroKey];
                  const terminoResaltado = resaltarPorFiltroColumna
                    ? filtroTextoColumna?.tipo === 'texto' && filtroTextoColumna.valor.trim() !== ''
                      ? filtroTextoColumna.valor.trim()
                      : busqueda
                    : busqueda;
                  return (
                    <p
                      key={columna.header}
                      onClick={columna.onClick ? () => columna.onClick!(item) : undefined}
                      className={`${claseCelda} border-black/20 border-b border-l flex items-center break-words group-hover:bg-neutro-100 transition-colors duration-100 ease-in ${claseCeldaAlerta} ${claseCeldaDeshabilitada} ${
                        resaltarFilaSeleccionada && seleccionada ? claseCeldaSeleccionada : ''
                      } ${
                        columna.onClick
                          ? 'cursor-pointer hover:bg-neutro-200 group-data-[alerta]:hover:bg-red-300'
                          : ''
                      } ${
                        columna.extraClassName ? columna.extraClassName(item) : ''
                      }`}
                    >
                      {columna.renderCell ? (
                        columna.renderCell(item)
                      ) : (
                        <span style={estiloCeldaTexto}>
                          {terminoResaltado
                            ? resaltarCoincidencia(valorTexto, terminoResaltado)
                            : valorTexto}
                        </span>
                      )}
                    </p>
                  );
                })}
                <div className={claseCeldaAccion(item)}>{renderAccion(item)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
