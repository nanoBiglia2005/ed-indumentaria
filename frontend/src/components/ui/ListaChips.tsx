import type { Opcion } from '@/types/comunes';

/**
 * Lista de chips con boton X para quitar, usada por los modales que editan
 * asociaciones (colegios/clubes de un articulo, lineas de un grupo).
 */
interface ListaChipsProps {
  items: Opcion[];
  onQuitar: (id: number) => void;
  textoVacio: string;
}

export default function ListaChips({ items, onQuitar, textoVacio }: ListaChipsProps) {
  if (items.length === 0) {
    return <p className='text-sm text-gray-400 italic'>{textoVacio}</p>;
  }

  return (
    <ul className='flex flex-wrap gap-2'>
      {items.map((item) => (
        <li
          key={item.id}
          className='flex items-center gap-1 justify-between px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700 w-fit'
        >
          <span>{item.nombre}</span>
          <button
            type='button'
            onClick={() => onQuitar(item.id)}
            className='font-bold text-gray-400 hover:text-red-600 cursor-pointer px-1'
          >
            X
          </button>
        </li>
      ))}
    </ul>
  );
}
