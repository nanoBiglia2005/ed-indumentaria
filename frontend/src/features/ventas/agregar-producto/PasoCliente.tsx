import { useMemo, useState } from 'react';
import type { Agrupacion, ClienteVenta } from '@/types/ventas';
import { normalizarBusqueda } from '@/utils/texto';
import { textoTodaLaAgrupacion } from './textos';

// Lista de clientes de una agrupacion, con su propio buscador: cada
// columna (Colegios, Clubes, ...) filtra de forma independiente.
function ListaClientesAgrupacion({
  agrupacion,
  nombreLinea,
  onSeleccionar,
  onSeleccionarAgrupacion,
}: {
  agrupacion: Agrupacion;
  nombreLinea: string | undefined;
  onSeleccionar: (cliente: ClienteVenta) => void;
  onSeleccionarAgrupacion: () => void;
}) {
  const [busqueda, setBusqueda] = useState('');

  const clientesFiltrados = useMemo(() => {
    if (busqueda.trim() === '') return agrupacion.clientes;
    const termino = normalizarBusqueda(busqueda);
    return agrupacion.clientes.filter((c) => normalizarBusqueda(c.nombre).includes(termino));
  }, [agrupacion.clientes, busqueda]);

  // El grupo entero se quedo sin opciones (la linea no le deja ninguna), que es
  // distinto de que el buscador no encuentre nada.
  const sinNinguno = agrupacion.clientes.length === 0;

  return (
    <div className='border border-gray-200 rounded-md overflow-hidden flex flex-col'>
      <div className='px-3 py-2 bg-stone-100 border-b border-gray-200 text-sm font-semibold text-gray-700'>
        {agrupacion.nombre_grupo}
      </div>

      {sinNinguno ? (
        <p className='px-3 py-6 text-sm text-gray-400 italic text-center'>
          Sin {agrupacion.nombre_grupo.toLowerCase()} con artículos vigentes
          {nombreLinea ? ` de ${nombreLinea}` : ''}.
        </p>
      ) : (
        <>
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
            {/* Pertenece a la lista pero queda fuera del buscador: elegir la
                agrupacion entera tiene que seguir a mano aunque se este
                buscando un colegio puntual. */}
            <li
              onClick={onSeleccionarAgrupacion}
              className='px-3 py-2 text-sm font-semibold text-violet-600 cursor-pointer hover:bg-violet-50 transition-colors duration-100 ease-in'
            >
              {textoTodaLaAgrupacion(agrupacion.nombre_grupo)}
            </li>

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
        </>
      )}
    </div>
  );
}

/** Paso 2 del wizard: elegir un colegio o club, agrupados por su grupo. */
export default function PasoCliente({
  agrupaciones,
  cargando,
  nombreLinea,
  onSeleccionar,
  onSeleccionarAgrupacion,
  onSeleccionarTodos,
}: {
  agrupaciones: Agrupacion[];
  cargando: boolean;
  nombreLinea: string | undefined;
  onSeleccionar: (cliente: ClienteVenta) => void;
  /** Acota a una agrupacion entera: todos los colegios, o todos los clubes. */
  onSeleccionarAgrupacion: (agrupacion: Agrupacion) => void;
  /** Saltea el filtro de cliente: se venden articulos de todos. */
  onSeleccionarTodos: () => void;
}) {
  // Sin ninguno en ningun grupo no tiene sentido ofrecer "Todos": no hay nada
  // atras de esa opcion.
  const hayAlguno = agrupaciones.some((agrupacion) => agrupacion.clientes.length > 0);

  return (
    <div className='flex flex-col gap-4'>
      {!cargando && hayAlguno && (
        <button
          type='button'
          onClick={onSeleccionarTodos}
          className='w-full rounded-md border border-violet-500 px-4 py-2.5 text-sm font-semibold text-violet-600 cursor-pointer hover:bg-violet-50 transition-colors duration-100 ease-in'
        >
          No filtrar por colegio o club
        </button>
      )}

      <div className='grid grid-cols-2 gap-4'>
        {cargando && agrupaciones.length === 0 && (
          <p className='col-span-2 text-sm text-gray-400 text-center py-6'>Cargando...</p>
        )}

        {agrupaciones.map((agrupacion) => (
          <ListaClientesAgrupacion
            key={agrupacion.id_grupo}
            agrupacion={agrupacion}
            nombreLinea={nombreLinea}
            onSeleccionar={onSeleccionar}
            onSeleccionarAgrupacion={() => onSeleccionarAgrupacion(agrupacion)}
          />
        ))}
      </div>
    </div>
  );
}
