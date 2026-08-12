import { useMemo, useState } from 'react';
import type { GRUPOS_DE_VENTA } from '@backend/types';
import { normalizarBusqueda } from '@/utils/texto';

/** Paso 2 del wizard: elegir un grupo con articulos del cliente. */
export default function PasoGrupo({
  grupos,
  cargando,
  nombreCliente,
  onSeleccionar,
}: {
  grupos: GRUPOS_DE_VENTA[];
  cargando: boolean;
  nombreCliente: string | undefined;
  onSeleccionar: (grupo: GRUPOS_DE_VENTA) => void;
}) {
  const [busquedaGrupos, setBusquedaGrupos] = useState('');

  const gruposFiltrados = useMemo(() => {
    if (busquedaGrupos.trim() === '') return grupos;
    const termino = normalizarBusqueda(busquedaGrupos);
    return grupos.filter((g) => normalizarBusqueda(g.nombre_grupo).includes(termino));
  }, [grupos, busquedaGrupos]);

  return (
    <div className='border border-gray-200 rounded-md overflow-hidden'>
      {cargando && <p className='text-sm text-gray-400 px-3 py-6 text-center'>Cargando grupos...</p>}

      {!cargando && grupos.length === 0 && (
        <p className='text-sm text-gray-400 italic px-3 py-6 text-center'>
          {nombreCliente} no tiene artículos vigentes asociados.
        </p>
      )}

      {!cargando && grupos.length > 0 && (
        <>
          <div className='p-2 border-b border-gray-100'>
            <input
              type='text'
              value={busquedaGrupos}
              onChange={(e) => setBusquedaGrupos(e.target.value)}
              placeholder='Buscar grupo...'
              className='w-full rounded border border-gray-300 bg-white py-1.5 px-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30'
            />
          </div>
          <ul className='max-h-96 overflow-y-auto divide-y divide-gray-100'>
            {gruposFiltrados.length === 0 ? (
              <li className='px-4 py-3 text-sm text-gray-400 italic'>Sin resultados</li>
            ) : (
              gruposFiltrados.map((g) => (
                <li
                  key={g.id_grupo}
                  onClick={() => onSeleccionar(g)}
                  className='px-4 py-2.5 text-sm text-gray-700 cursor-pointer hover:bg-amber-50 transition-colors duration-100 ease-in'
                >
                  {g.nombre_grupo}
                </li>
              ))
            )}
          </ul>
        </>
      )}
    </div>
  );
}
