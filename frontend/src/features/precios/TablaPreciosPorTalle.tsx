import type { ReactNode } from 'react';

/** Una fila de la tabla: un talle del recorte elegido y el precio que se le
 *  esta cargando. `clave` identifica la fila (los ids de los articulos los
 *  guarda la pagina, la tabla no los necesita). */
export interface FilaPrecio {
  clave: string;
  /** Texto del talle ("Sin Talle" para los articulos sin talle cargado). */
  etiqueta: string;
  /** Cuantos articulos se van a actualizar con este precio. */
  cantidad: number;
  /** Lo tipeado en el input (siempre digitos, puede estar vacio). */
  valor: string;
  /** Precio actual del talle, o "min, max" si sus articulos no valen lo mismo. */
  placeholder: string;
}

interface TablaPreciosPorTalleProps {
  filas: FilaPrecio[];
  onCambiarPrecio: (clave: string, valor: string) => void;
  /** Digitos maximos del precio (sale de PRECIO_MAX). */
  maxDigitos: number;
  /** Que se muestra bajo los encabezados cuando no hay ninguna fila. */
  estadoVacio?: ReactNode;
}

/**
 * Tabla de "un precio por talle". Las filas llegan ya ordenadas por la pagina
 * (mismo criterio de talle que la DataGrid: numerico cuando se puede).
 *
 * Los encabezados se ven SIEMPRE, tenga filas o no: la tabla es el fondo fijo
 * de la pagina y el vacio se llena con `estadoVacio`.
 */
export default function TablaPreciosPorTalle({
  filas,
  onCambiarPrecio,
  maxDigitos,
  estadoVacio = null,
}: TablaPreciosPorTalleProps) {
  return (
    <div className='flex-1 min-h-0 overflow-auto border rounded-xl border-black/30 shadow'>
      <table className='w-full border-collapse text-sm sm:text-base'>
        <thead className='sticky top-0 z-10 bg-violet-500 text-white'>
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

          {filas.map((fila) => (
            <tr
              key={fila.clave}
              className='border-b border-black/20 transition-colors duration-100 ease-in hover:bg-amber-50'
            >
              <td className='px-4 py-2 font-semibold text-gray-800'>{fila.etiqueta}</td>
              <td className='px-4 py-2 text-gray-500'>{fila.cantidad}</td>
              <td className='px-4 py-2'>
                {/* Ancho generoso: el placeholder puede ser un rango entero
                    ("12500, 18900") y no tiene que quedar cortado. */}
                <div className='relative w-36 sm:w-48'>
                  <span className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400'>
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
                    // El placeholder es el precio que hoy tiene el talle: lo que
                    // se ve ahi es lo que se va a pisar si se escribe algo.
                    placeholder={fila.placeholder}
                    aria-label={`Precio para el talle ${fila.etiqueta}`}
                    className='w-full rounded border border-gray-300 bg-white py-1.5 pl-7 pr-3 text-gray-700 placeholder:text-gray-300 transition-colors duration-100 ease-in hover:border-violet-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30'
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
