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
    <div className='border border-neutro-200 rounded overflow-hidden flex flex-col'>
      <div className='px-3 py-2 bg-neutro-100 border-b border-neutro-200 text-sm font-semibold text-neutro-600'>
        {agrupacion.nombre_grupo}
      </div>

      {sinNinguno ? (
        <p className='px-3 py-6 text-sm text-neutro-400 italic text-center'>
          Sin {agrupacion.nombre_grupo.toLowerCase()} con artículos vigentes
          {nombreLinea ? ` de ${nombreLinea}` : ''}.
        </p>
      ) : (
        <>
          <div className='p-2 border-b border-neutro-200'>
            <input
              type='text'
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder={`Buscar en ${agrupacion.nombre_grupo}...`}
              className='w-full rounded border border-neutro-200 bg-white py-1 px-2 text-sm text-neutro-600 placeholder:text-neutro-400 focus:border-marca-500 focus:outline-none focus:ring-2 focus:ring-marca-500/30'
            />
          </div>
          <ul className='max-h-72 overflow-y-auto divide-y divide-neutro-200'>
            {/* Pertenece a la lista pero queda fuera del buscador: elegir la
                agrupacion entera tiene que seguir a mano aunque se este
                buscando un colegio puntual. */}
            <li
              onClick={onSeleccionarAgrupacion}
              className='px-3 py-2 text-sm font-semibold text-marca-600 cursor-pointer hover:bg-marca-50 transition-colors duration-100 ease-in'
            >
              {textoTodaLaAgrupacion(agrupacion.nombre_grupo)}
            </li>

            {clientesFiltrados.length === 0 ? (
              <li className='px-3 py-2 text-sm text-neutro-400 italic'>Sin resultados</li>
            ) : (
              clientesFiltrados.map((c) => (
                <li
                  key={c.id_cliente}
                  onClick={() => onSeleccionar(c)}
                  className='px-3 py-2 text-sm text-neutro-600 cursor-pointer hover:bg-neutro-100 transition-colors duration-100 ease-in'
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
          className='w-full rounded border border-marca-500 px-4 py-2.5 text-sm font-semibold text-marca-600 cursor-pointer hover:bg-marca-50 transition-colors duration-100 ease-in'
        >
          No filtrar por colegio o club
        </button>
      )}

      <div className='grid grid-cols-2 gap-4'>
        {cargando && agrupaciones.length === 0 && (
          <p className='col-span-2 text-sm text-neutro-400 text-center py-6'>Cargando...</p>
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
