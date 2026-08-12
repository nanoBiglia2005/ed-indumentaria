import { useMemo, useState } from 'react';
import type { Agrupacion, ClienteVenta } from '@/types/ventas';
import { normalizarBusqueda } from '@/utils/texto';

// Lista de clientes de una agrupacion, con su propio buscador: cada
// columna (Colegios, Clubes, ...) filtra de forma independiente.
function ListaClientesAgrupacion({
  agrupacion,
  onSeleccionar,
}: {
  agrupacion: Agrupacion;
  onSeleccionar: (cliente: ClienteVenta) => void;
}) {
  const [busqueda, setBusqueda] = useState('');

  const clientesFiltrados = useMemo(() => {
    if (busqueda.trim() === '') return agrupacion.clientes;
    const termino = normalizarBusqueda(busqueda);
    return agrupacion.clientes.filter((c) => normalizarBusqueda(c.nombre).includes(termino));
  }, [agrupacion.clientes, busqueda]);

  return (
    <div className='border border-gray-200 rounded-md overflow-hidden flex flex-col'>
      <div className='px-3 py-2 bg-stone-100 border-b border-gray-200 text-sm font-semibold text-gray-700'>
        {agrupacion.nombre_grupo}
      </div>
      <div className='p-2 border-b border-gray-100'>
        <input
          type='text'
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder={`Buscar en ${agrupacion.nombre_grupo}...`}
          className='w-full rounded border border-gray-300 bg-white py-1 px-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30'
        />
      </div>
      <ul className='max-h-72 overflow-y-auto divide-y divide-gray-100'>
        {clientesFiltrados.length === 0 ? (
          <li className='px-3 py-2 text-sm text-gray-400 italic'>Sin resultados</li>
        ) : (
          clientesFiltrados.map((c) => (
            <li
              key={c.id_cliente}
              onClick={() => onSeleccionar(c)}
              className='px-3 py-2 text-sm text-gray-700 cursor-pointer hover:bg-amber-50 transition-colors duration-100 ease-in'
            >
              {c.nombre}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

/** Paso 1 del wizard: elegir un colegio o club, agrupados por su grupo. */
export default function PasoCliente({
  agrupaciones,
  cargando,
  onSeleccionar,
}: {
  agrupaciones: Agrupacion[];
  cargando: boolean;
  onSeleccionar: (cliente: ClienteVenta) => void;
}) {
  return (
    <div className='grid grid-cols-2 gap-4'>
      {cargando && agrupaciones.length === 0 && (
        <p className='col-span-2 text-sm text-gray-400 text-center py-6'>Cargando...</p>
      )}

      {agrupaciones.map((agrupacion) => (
        <ListaClientesAgrupacion
          key={agrupacion.id_grupo}
          agrupacion={agrupacion}
          onSeleccionar={onSeleccionar}
        />
      ))}
    </div>
  );
}
