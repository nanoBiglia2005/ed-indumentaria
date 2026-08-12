import { useMemo, useState, type ReactNode } from 'react';
import type { Opcion } from '@/types/comunes';
import { normalizarBusqueda } from '@/utils/texto';

interface ListaSeleccionableProps {
  opciones: Opcion[];
  onSeleccionar: (opcion: Opcion) => void;
  cargando?: boolean;
  mensajeCargando?: string;
  /** Lo que se muestra cuando no hay NINGUNA opcion (distinto de "Sin resultados"). */
  mensajeVacio: ReactNode;
  placeholder?: string;
  /** Alto maximo de la lista: el wizard de venta usa max-h-96. */
  claseLista?: string;
}

/**
 * Lista de opciones con buscador, para los pasos de un recorrido en cascada
 * (elegir cliente -> grupo -> ..., elegir linea -> grupo -> subgrupo).
 *
 * Salio tal cual de features/ventas/agregar-producto/PasoGrupo.tsx al aparecer
 * el segundo uso (la pagina de Precios): ese paso ahora la usa por dentro, asi
 * los dos recorridos se ven y se comportan igual.
 */
export default function ListaSeleccionable({
  opciones,
  onSeleccionar,
  cargando = false,
  mensajeCargando = 'Cargando...',
  mensajeVacio,
  placeholder = 'Buscar...',
  claseLista = 'max-h-96',
}: ListaSeleccionableProps) {
  const [busqueda, setBusqueda] = useState('');

  const opcionesFiltradas = useMemo(() => {
    if (busqueda.trim() === '') return opciones;
    const termino = normalizarBusqueda(busqueda);
    return opciones.filter((opcion) => normalizarBusqueda(opcion.nombre).includes(termino));
  }, [opciones, busqueda]);

  return (
    <div className='border border-gray-200 rounded-md overflow-hidden'>
      {cargando && <p className='text-sm text-gray-400 px-3 py-6 text-center'>{mensajeCargando}</p>}

      {!cargando && opciones.length === 0 && (
        <p className='text-sm text-gray-400 italic px-3 py-6 text-center'>{mensajeVacio}</p>
      )}

      {!cargando && opciones.length > 0 && (
        <>
          <div className='p-2 border-b border-gray-100'>
            <input
              type='text'
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder={placeholder}
              className='w-full rounded border border-gray-300 bg-white py-1.5 px-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30'
            />
          </div>
          <ul className={`${claseLista} overflow-y-auto divide-y divide-gray-100`}>
            {opcionesFiltradas.length === 0 ? (
              <li className='px-4 py-3 text-sm text-gray-400 italic'>Sin resultados</li>
            ) : (
              opcionesFiltradas.map((opcion) => (
                <li
                  key={opcion.id}
                  onClick={() => onSeleccionar(opcion)}
                  className='px-4 py-2.5 text-sm text-gray-700 cursor-pointer hover:bg-amber-50 transition-colors duration-100 ease-in'
                >
                  {opcion.nombre}
                </li>
              ))
            )}
          </ul>
        </>
      )}
    </div>
  );
}
