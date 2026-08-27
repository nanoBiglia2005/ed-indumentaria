import type { Opcion } from '@/types/comunes';

/**
 * Lista de chips con boton X para quitar, usada por los modales que editan
 * asociaciones (colegios/clubes de un articulo, lineas de un grupo).
 */
interface ListaChipsProps {
  items: Opcion[];
  /** Si no se pasa, los chips quedan de solo lectura (sin boton X). */
  onQuitar?: (id: number) => void;
  textoVacio: string;
  /**
   * Cantidad de chips a mostrar completos; el resto se colapsa en un chip
   * "+N" que muestra los nombres escondidos al hacer hover.
   */
  maxVisible?: number;
}

export default function ListaChips({ items, onQuitar, textoVacio, maxVisible }: ListaChipsProps) {
  if (items.length === 0) {
    return <div className='flex items-center justify-center w-full'>
        <p className='text-sm text-gray-400 italic'>{textoVacio}</p>
      </div>;
  }

  const limite = maxVisible && maxVisible > 0 ? maxVisible : items.length;
  const visibles = items.slice(0, limite);
  const ocultos = items.slice(limite);

  return (
    <ul className='flex flex-wrap gap-2 px-2'>
      {visibles.map((item) => (
        <li
          key={item.id}
          className='flex items-center gap-1 justify-between px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700 w-fit'
        >
          <span>{item.nombre}</span>
          {onQuitar && (
            <button
              type='button'
              onClick={() => onQuitar(item.id)}
              className='font-bold text-gray-400 hover:text-red-600 cursor-pointer px-1'
            >
              X
            </button>
          )}
        </li>
      ))}

      {ocultos.length > 0 && (
        <li className='group relative w-fit'>
          <span className='flex items-center px-3 py-1.5 bg-violet-50 border border-violet-200 rounded text-sm font-medium text-violet-700 cursor-default'>
            +{ocultos.length}
          </span>
          <div className='pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 hidden -translate-x-1/2 flex-col gap-0.5 whitespace-nowrap rounded-md bg-gray-900 px-3 py-2 text-xs text-white shadow-lg group-hover:flex'>
            {ocultos.map((item) => (
              <span key={item.id}>{item.nombre}</span>
            ))}
            <div className='absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-gray-900' />
          </div>
        </li>
      )}
    </ul>
  );
}
