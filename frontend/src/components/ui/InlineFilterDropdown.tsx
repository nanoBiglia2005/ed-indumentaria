import { useEffect, useMemo, useRef, useState } from 'react';
import { normalizarBusqueda } from '@/utils/texto';

export type OpcionFiltro = { id: number; nombre: string };

interface InlineFilterDropdownProps {
  label: string;
  opciones: OpcionFiltro[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onClear: () => void;
  disabled?: boolean;
  /** Agrega un buscador dentro del desplegable. */
  conBuscador?: boolean;
  /**
   * Muestra la X para volver a "sin seleccion". Se apaga cuando el valor es
   * obligatorio y solo puede reemplazarse por otro (p. ej. el grupo de un
   * articulo); ahi `onClear` nunca se llama.
   */
  permitirLimpiar?: boolean;
}

function InlineFilterDropdown({
  label,
  opciones,
  selectedId,
  onSelect,
  onClear,
  disabled = false,
  conBuscador = false,
  permitirLimpiar = true,
}: InlineFilterDropdownProps) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const contenedorRef = useRef<HTMLDivElement>(null);
  const seleccionada = opciones.find((o) => o.id === selectedId) ?? null;

  // Al cerrarse se limpia la busqueda, asi la proxima vez abre completo.
  const cerrar = () => {
    setAbierto(false);
    setBusqueda('');
  };

  useEffect(() => {
    if (!abierto) return;
    const handleClickFuera = (e: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
        setBusqueda('');
      }
    };
    document.addEventListener('mousedown', handleClickFuera);
    return () => document.removeEventListener('mousedown', handleClickFuera);
  }, [abierto]);

  const opcionesFiltradas = useMemo(() => {
    if (!conBuscador || busqueda.trim() === '') return opciones;
    const termino = normalizarBusqueda(busqueda);
    return opciones.filter((opcion) => normalizarBusqueda(opcion.nombre).includes(termino));
  }, [conBuscador, busqueda, opciones]);

  return (
    <div ref={contenedorRef} className='relative'>
      <button
        type='button'
        disabled={disabled}
        onClick={() => (abierto ? cerrar() : setAbierto(true))}
        className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded border min-w-[150px] font-semibold text-md transition-color duration-100 ease-in ${
          disabled
            ? 'opacity-50 cursor-not-allowed border-gray-300 text-gray-400'
            : 'cursor-pointer text-violet-500 hover:bg-amber-400 hover:text-white'
        } ${seleccionada ? '!bg-violet-500 !text-white' : ''}`}
      >
        <span className='truncate'>{seleccionada ? seleccionada.nombre : label}</span>
        {seleccionada && permitirLimpiar ? (
          <span
            role='button'
            onClick={(e) => {
              e.stopPropagation();
              onClear();
              cerrar();
            }}
            className='font-bold ps-1 hover:text-red-200 shrink-0'
          >
            X
          </span>
        ) : (
          <svg
            className={`w-3 h-3 shrink-0 transition-transform duration-150 ease-in ${abierto ? 'rotate-180' : ''}`}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth={2}
          >
            <path strokeLinecap='round' strokeLinejoin='round' d='M19 9l-7 7-7-7' />
          </svg>
        )}
      </button>

      <div
        className={`absolute z-20 mt-1 w-56 origin-top rounded-md border border-gray-200 bg-white shadow-lg transition-all duration-150 ease-in-out overflow-hidden ${
          abierto ? 'opacity-100 scale-100 max-h-72' : 'opacity-0 scale-95 max-h-0 pointer-events-none'
        }`}
      >
        {conBuscador && (
          <div className='p-2 border-b border-gray-100'>
            <input
              type='text'
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder='Buscar...'
              className='w-full rounded border border-gray-300 bg-white py-1 px-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30'
            />
          </div>
        )}

        <ul className='max-h-56 overflow-y-auto py-1'>
          {opcionesFiltradas.length === 0 ? (
            <li className='px-3 py-2 text-md text-gray-400 italic'>
              {opciones.length === 0 ? 'Sin opciones' : 'Sin resultados'}
            </li>
          ) : (
            opcionesFiltradas.map((opcion) => (
              <li
                key={opcion.id}
                onClick={() => {
                  onSelect(opcion.id);
                  cerrar();
                }}
                className={`px-3 py-1.5 text-md cursor-pointer hover:bg-amber-50 transition-colors duration-100 ease-in ${
                  opcion.id === selectedId ? 'bg-violet-50 text-violet-700 font-semibold' : 'text-gray-700'
                }`}
              >
                {opcion.nombre}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

export default InlineFilterDropdown;
