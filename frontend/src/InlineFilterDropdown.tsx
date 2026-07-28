import { useEffect, useRef, useState } from 'react';

export type OpcionFiltro = { id: number; nombre: string };

interface InlineFilterDropdownProps {
  label: string;
  opciones: OpcionFiltro[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onClear: () => void;
  disabled?: boolean;
}

function InlineFilterDropdown({
  label,
  opciones,
  selectedId,
  onSelect,
  onClear,
  disabled = false,
}: InlineFilterDropdownProps) {
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const seleccionada = opciones.find((o) => o.id === selectedId) ?? null;

  useEffect(() => {
    if (!abierto) return;
    const handleClickFuera = (e: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener('mousedown', handleClickFuera);
    return () => document.removeEventListener('mousedown', handleClickFuera);
  }, [abierto]);

  return (
    <div ref={contenedorRef} className='relative'>
      <button
        type='button'
        disabled={disabled}
        onClick={() => setAbierto((prev) => !prev)}
        className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded border min-w-[150px] font-semibold text-md transition-color duration-100 ease-in ${
          disabled
            ? 'opacity-50 cursor-not-allowed border-gray-300 text-gray-400'
            : 'cursor-pointer text-violet-500 hover:bg-amber-400 hover:text-white'
        } ${seleccionada ? '!bg-violet-500 !text-white' : ''}`}
      >
        <span className='truncate'>{seleccionada ? seleccionada.nombre : label}</span>
        {seleccionada ? (
          <span
            role='button'
            onClick={(e) => {
              e.stopPropagation();
              onClear();
              setAbierto(false);
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
          abierto ? 'opacity-100 scale-100 max-h-56' : 'opacity-0 scale-95 max-h-0 pointer-events-none'
        }`}
      >
        <ul className='max-h-56 overflow-y-auto py-1'>
          {opciones.length === 0 ? (
            <li className='px-3 py-2 text-md text-gray-400 italic'>Sin opciones</li>
          ) : (
            opciones.map((opcion) => (
              <li
                key={opcion.id}
                onClick={() => {
                  onSelect(opcion.id);
                  setAbierto(false);
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
