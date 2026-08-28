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
  claseInput = 'w-full rounded border border-gray-300 bg-white py-1.5 pl-9 pr-8 text-sm text-gray-700 placeholder:text-gray-400 transition-colors duration-100 ease-in hover:border-violet-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30',
}: SearchInputProps) {
  return (
    <div className={claseContenedor}>
      <svg
        className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400'
        fill='none'
        viewBox='0 0 24 24'
        stroke='currentColor'
        strokeWidth={2}
      >
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          d='M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.35 4.35a7.5 7.5 0 0012.3 12.3z'
        />
      </svg>
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
          className='absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer font-bold text-gray-400 hover:text-violet-600'
        >
          ×
        </button>
      )}
    </div>
  );
}
