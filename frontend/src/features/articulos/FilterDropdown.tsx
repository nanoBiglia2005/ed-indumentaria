import { useState } from 'react';
import type { Opcion } from '@/types/comunes';
import SelectListModal from '@/components/ui/SelectListModal';

/**
 * Boton de filtro de pagina (Grupo / Subgrupo / Colegio-Club) que abre un
 * SelectListModal para elegir. Distinto del InlineFilterDropdown (popover):
 * este usa modal con buscador y boton "Crear".
 */
export default function FilterDropdown({
  label,
  opciones,
  selectedId,
  onSelect,
  onClear,
  disabled = false,
  onCrear,
  crearLabel,
}: {
  label: string;
  opciones: Opcion[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onClear: () => void;
  disabled?: boolean;
  onCrear?: () => void;
  crearLabel?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const seleccionada = opciones.find((o) => o.id === selectedId) ?? null;

  return (
    <div className='relative'>
      <button
        disabled={disabled}
        onClick={() => setAbierto(true)}
        className={`flex items-center justify-between gap-1 sm:gap-1.5 lg:gap-2 px-2 py-1 sm:px-3 sm:py-1 lg:px-4 rounded border min-w-0 lg:min-w-[140px] font-semibold whitespace-nowrap transition-color duration-100 ease-in ${
          disabled
            ? 'cursor-not-allowed border-gray-300 text-gray-400'
            : 'cursor-pointer text-violet-500 hover:bg-amber-400 hover:text-white'
        } ${seleccionada ? 'bg-violet-500 text-white' : ''}`}
      >
        <span className='text-sm sm:text-base lg:text-xl'>{seleccionada ? seleccionada.nombre : label}</span>
        {seleccionada && (
          <span
            role='button'
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className='font-bold ps-1 hover:text-red-600'
          >
            X
          </span>
        )}
      </button>

      <SelectListModal
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        titulo={label}
        opciones={opciones}
        onSelect={(opcion) => {
          onSelect(opcion.id);
          setAbierto(false);
        }}
        onCrear={
          onCrear
            ? () => {
                setAbierto(false);
                onCrear();
              }
            : undefined
        }
        crearLabel={crearLabel}
      />
    </div>
  );
}
