import { Fragment } from 'react';
import type { ReactNode } from 'react';
import type { TIPOS_DE_PAGO } from '@backend/types';
import PreciosPorMetodo from '@/components/ui/PreciosPorMetodo';

/** Un articulo dentro de la fila desplegada de su talle. */
export interface ArticuloDeFila {
  id: number;
  descripcion: string;
  /** Lo que muestra el input: SIEMPRE un precio concreto (tipeado, o el
   *  actual si no se toco nada) — nunca vacio, asi que va de `value`, no de
   *  `placeholder`: a diferencia del talle, un articulo nunca es un rango. */
  valor: string;
  /** Si el precio efectivo difiere del que trajo el backend: enciende el punto de al lado del input. */
  cambiado: boolean;
}

/** Una fila de la tabla: un talle del recorte elegido y el precio que se le
 *  esta cargando. `clave` identifica la fila (los ids de los articulos los
 *  guarda la pagina, la tabla no los necesita). */
export interface FilaPrecio {
  clave: string;
  /** Texto del talle ("Sin Talle" para los articulos sin talle cargado). */
  etiqueta: string;
  /** Cuantos articulos se van a actualizar con este precio. */
  cantidad: number;
  /** Precio unico de todos sus articulos, si lo hay: va de `value`. Vacio
   *  cuando no lo hay (ver `placeholder`). */
  valor: string;
  /** Rango "min - max" cuando los articulos no valen todos lo mismo: el input
   *  no puede tener un rango como `value`, asi que este caso va de
   *  `placeholder` en vez de precargarlo. Vacio cuando `valor` no lo esta. */
  placeholder: string;
  /** Si al menos uno de sus articulos cambio: enciende el punto de al lado del input. */
  cambiado: boolean;
  /** Los articulos del talle, para el panel desplegable. */
  articulos: ArticuloDeFila[];
}

interface TablaPreciosPorTalleProps {
  filas: FilaPrecio[];
  onCambiarPrecio: (clave: string, valor: string) => void;
  onCambiarPrecioArticulo: (idArticulo: number, valor: string) => void;
  /** Clave del talle desplegado, o null si ninguno lo esta. Solo uno a la vez. */
  abierto: string | null;
  onToggleTalle: (clave: string) => void;
  /** Digitos maximos del precio (sale de PRECIO_MAX). */
  maxDigitos: number;
  metodosDePago: TIPOS_DE_PAGO[];
  /** Que se muestra bajo los encabezados cuando no hay ninguna fila. */
  estadoVacio?: ReactNode;
}

/**
 * Punto que marca un precio modificado, al lado de su input.
 *
 * `className` deja que quien lo usa decida el posicionamiento: en flujo
 * normal (flex, junto al input) o `absolute` para que NO le sume ancho a su
 * contenedor — necesario en la fila del talle, donde el <td> es parte de una
 * columna de una tabla `w-full`: si el punto entra al flujo, agranda la
 * columna Precio y el navegador se la resta a las demas para mantener el
 * ancho total, corriendolas. Absoluto, cae en el margen que ya le sobra al
 * input dentro de la celda sin empujar nada.
 */
function IndicadorDeCambio({ className = '' }: { className?: string }) {
  return (
    <span
      className={`w-2 h-2 rounded-full bg-acento-500 shrink-0 ${className}`}
      role='img'
      aria-label='Precio modificado'
      title='Precio modificado'
    />
  );
}

// Mismo esquema de bordes/foco para el input del talle y el de cada articulo:
// el segundo solo es mas compacto.
const CLASES_INPUT_PRECIO =
  'w-40 sm:w-50 h-fit rounded border border-neutro-200 bg-white pl-7 pr-3 text-neutro-600 placeholder:text-neutro-400 transition-colors duration-100 ease-in hover:border-marca-400 focus:border-marca-500 focus:outline-none focus:ring-2 focus:ring-marca-500/30';

/**
 * Tabla de "un precio por talle", con cada talle desplegable para editar el
 * precio de sus articulos uno por uno. Las filas llegan ya ordenadas por la
 * pagina (mismo criterio de talle que la DataGrid: numerico cuando se puede).
 *
 * Los encabezados se ven SIEMPRE, tenga filas o no: la tabla es el fondo fijo
 * de la pagina y el vacio se llena con `estadoVacio`.
 *
 * El panel desplegado va en una SEGUNDA <tr> por talle (con un <td colSpan>),
 * no dentro de la celda del talle: asi el detalle ocupa el ancho entero de la
 * tabla y no desalinea las columnas de la fila de arriba.
 */
export default function TablaPreciosPorTalle({
  filas,
  onCambiarPrecio,
  onCambiarPrecioArticulo,
  abierto: claveAbierta,
  onToggleTalle,
  maxDigitos,
  metodosDePago,
  estadoVacio = null,
}: TablaPreciosPorTalleProps) {
  return (
    <div className='flex-1 min-h-0 overflow-auto border rounded border-black/30'>
      <table className='w-full border-collapse text-sm sm:text-base'>
        <thead className='sticky top-0 z-10 bg-marca-500 text-white'>
          <tr>
            <th className='px-4 py-3 text-left font-semibold'>Talle</th>
            <th className='px-4 py-3 text-left font-semibold whitespace-nowrap'>Artículos</th>
            <th className='px-4 py-3 text-left font-semibold'>Precio</th>
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 && estadoVacio !== null && (
            <tr>
              <td colSpan={3} className='px-4'>
                {estadoVacio}
              </td>
            </tr>
          )}

          {filas.map((fila) => {
            const abierto = claveAbierta === fila.clave;

            return (
              <Fragment key={fila.clave}>
                <tr
                  className={`transition-colors duration-100 ease-in cursor-pointer hover:bg-neutro-100 ${
                    abierto ? '' : 'border-b border-black/20'
                  }`}
                  onClick={() => onToggleTalle(fila.clave)}
                >
                  <td className='px-4 py-2 font-semibold text-neutro-900'>
                    {/* El toggle esta en la <tr>: cualquier punto de la fila lo
                        dispara, salvo el input de precio (ver stopPropagation
                        mas abajo). Este boton es decorativo (talle + chevron),
                        no un target de click propio. */}
                    <button
                      type='button'
                      aria-expanded={abierto}
                      className='flex items-center gap-2 rounded px-2 py-1 -mx-2 transition-colors duration-100 cursor-pointer ease-in hover:bg-neutro-100'
                    >
                      <span className='truncate'>{fila.etiqueta}</span>
                      <svg
                        className={`w-4 h-4 text-neutro-400 transition-transform duration-200 ease-in-out ${
                          abierto ? 'rotate-180' : ''
                        }`}
                        fill='none'
                        viewBox='0 0 24 24'
                        stroke='currentColor'
                        strokeWidth={2}
                      >
                        <path strokeLinecap='round' strokeLinejoin='round' d='M19 9l-7 7-7-7' />
                      </svg>
                    </button>
                  </td>
                  <td className='px-4 py-2 text-neutro-600'>{fila.cantidad}</td>
                  <td className='px-4 py-2'>
                    {/* Ancho generoso: el placeholder puede ser un rango entero
                        ("12500 - 18900") y no tiene que quedar cortado.
                        stopPropagation: la fila entera togglea el panel, y sin
                        esto un click para enfocar el input lo cerraria. */}
                    <div className='relative w-full' onClick={(e) => e.stopPropagation()}>
                      <div className='flex items-center gap-2'>
                        <span className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutro-400'>
                          $
                        </span>
                        {/* type='text' + inputMode='numeric': el type='number' deja
                            escribir "e", "-" y comas, y ademas value queda vacio
                            cuando el texto es invalido. Aca el filtro de digitos lo
                            hace la pagina y el input muestra siempre lo que se acepto. */}
                        <input
                          type='text'
                          inputMode='numeric'
                          autoComplete='off'
                          maxLength={maxDigitos}
                          value={fila.valor}
                          onChange={(e) => onCambiarPrecio(fila.clave, e.target.value)}
                          // `valor` es un precio concreto cuando todos sus
                          // articulos valen lo mismo; si no, queda vacio y el
                          // placeholder muestra el rango (el input no puede
                          // representar un rango como valor).
                          placeholder={fila.placeholder}
                          aria-label={`Precio para el talle ${fila.etiqueta}`}
                          className={`${CLASES_INPUT_PRECIO} py-1.5`}
                        />
                        <div className='relative'>
                          {fila.valor !== '' && (
                            <PreciosPorMetodo
                              precio={Number(fila.valor)}
                              metodos={metodosDePago}
                              tamanoIcono={15}
                              tamanoTexto='sm'
                              claseContenedor='select-none flex flex-col items-center w-fit gap-y-1'
                            />
                          )}
                          {fila.cambiado && (
                            <IndicadorDeCambio className='absolute left-full ml-2 top-1/2 -translate-y-1/2' />
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>

                {/* Fila del detalle: siempre montada (si no, no habria nada que
                    animar) y lo que se anima es su alto maximo. */}
                <tr className={abierto ? 'border-b border-black/20' : ''}>
                  <td colSpan={3} className='p-0'>
                    <div
                      className={`overflow-y-auto transition-all duration-200 ease-in-out ${
                        abierto ? 'max-h-72 border-t border-black/10' : 'max-h-0'
                      }`}
                    >
                      <div className='px-4 sm:px-6 py-2'>
                        {fila.articulos.length === 0 ? (
                          <p className='py-2 text-sm italic text-neutro-400'>Sin artículos</p>
                        ) : (
                          // Grid de 2 columnas, las dos a su contenido (`max-content`):
                          // la de descripcion se achica/agranda con la mas larga del
                          // talle, y la de precio queda con el ancho de un input — asi
                          // los inputs quedan pegados a la descripcion (no estirados
                          // al borde derecho del panel) y a la vez alineados entre si
                          // (comparten la misma columna). Cada fila son dos hijos
                          // directos del grid (sin wrapper), por eso el Fragment.
                          <div className='grid grid-cols-[max-content_max-content] items-center gap-x-4 gap-y-2'>
                            {/* Encabezado del panel: dos hijos mas del mismo
                                grid, asi quedan en las mismas columnas que las
                                filas de abajo sin tener que repetir el ancho a
                                mano. */}
                            <span className='pb-1 border-b border-black/10 text-[10px] font-semibold uppercase tracking-wide text-neutro-400'>
                              Artículo
                            </span>
                            <span className='pb-1 border-b border-black/10 text-[10px] font-semibold uppercase tracking-wide text-neutro-400'>
                              Precio
                            </span>
                            {fila.articulos.map((articulo) => {
                              return (
                                <Fragment key={articulo.id}>
                                  <span
                                    className={`max-w-[12rem] sm:max-w-xs flex truncate text-sm text-neutro-900`}
                                    title={articulo.descripcion}
                                  >
                                    {articulo.descripcion}
                                  </span>
                                    <div className='relative'>
                                      <div className='flex'>
                                        <span className='pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-neutro-400'>
                                          $
                                        </span>
                                        <input
                                          type='text'
                                          inputMode='numeric'
                                          autoComplete='off'
                                          maxLength={maxDigitos}
                                          value={articulo.valor}
                                          onChange={(e) =>
                                            onCambiarPrecioArticulo(articulo.id, e.target.value)
                                          }
                                          aria-label={`Precio para ${articulo.descripcion}`}
                                          className={`${CLASES_INPUT_PRECIO} py-1 text-sm`}
                                        />
                                        <div className='relative'>
                                          {articulo.valor !== '' && (
                                            <PreciosPorMetodo
                                              precio={Number(articulo.valor)}
                                              metodos={metodosDePago}
                                              tamanoIcono={15}
                                              tamanoTexto='sm'
                                              claseContenedor='select-none flex items-center w-fit gap-y-1 bg-white'
                                            />
                                          )}
                                          {articulo.cambiado && <IndicadorDeCambio className='absolute left-full ml-2 top-1/2 -translate-y-1/2'/>}
                                        </div>
                                      </div>
                                    </div>
                                </Fragment>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
