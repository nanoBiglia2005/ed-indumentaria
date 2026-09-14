import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/csr/MagnifyingGlass';

/**
 * Buscador estandar: lupa a la izquierda y boton "×" para limpiar.
 * Antes estaba copiado en SelectListModal, AgrupacionSection, ArticulosPage
 * y AgregarProductoModal.
 */
interface SearchInputProps {
  valor: string;
  onCambio: (valor: string) => void;
  placeholder?: string;
  /** Clases del contenedor (posicionamiento/margenes segun el lugar). */
  claseContenedor?: string;
  /** Override de las clases del input si el contexto usa otro tamano. */
  claseInput?: string;
}

export default function SearchInput({
  valor,
  onCambio,
  placeholder = 'Buscar...',
  claseContenedor = 'relative flex items-center',
  claseInput = 'w-full rounded border border-neutro-200 bg-white py-1.5 pl-9 pr-8 text-sm text-neutro-600 placeholder:text-neutro-400 transition-colors duration-100 ease-in hover:border-marca-400 focus:border-marca-500 focus:outline-none focus:ring-2 focus:ring-marca-500/30',
}: SearchInputProps) {
  return (
    <div className={claseContenedor}>
      <MagnifyingGlassIcon
        size={16}
        weight='bold'
        className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutro-400'
      />
      <input
        type='text'
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        placeholder={placeholder}
        className={claseInput}
      />
      {valor && (
        <button
          type='button'
          onClick={() => onCambio('')}
          className='absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer font-bold text-neutro-400 hover:text-marca-600'
        >
          ×
        </button>
      )}
    </div>
  );
}
