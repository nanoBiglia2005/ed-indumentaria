interface PaginadorProps {
  /** Pagina actual, empezando en 1. */
  pagina: number;
  /** Cuantos registros trae cada pagina. */
  tamano: number;
  /** Total de registros que coinciden con los filtros (viene del count()). */
  total: number;
  cargando?: boolean;
  onCambiarPagina: (pagina: number) => void;
}

function Chevron({ hacia }: { hacia: 'izquierda' | 'derecha' }) {
  return (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2.5} className='h-4 w-4'>
      <path
        d={hacia === 'izquierda' ? 'M15 6 L9 12 L15 18' : 'M9 6 L15 12 L9 18'}
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  );
}

/**
 * Rango visible y navegacion entre paginas ("1-30 de 7.507"). El total sale del
 * count() del backend, no de contar las filas cargadas: por eso muestra cuantos
 * registros coinciden aunque solo se hayan traido los de esta pagina.
 */
export default function Paginador({
  pagina,
  tamano,
  total,
  cargando = false,
  onCambiarPagina,
}: PaginadorProps) {
  const desde = total === 0 ? 0 : (pagina - 1) * tamano + 1;
  const hasta = Math.min(pagina * tamano, total);
  const ultimaPagina = Math.max(1, Math.ceil(total / tamano));

  const claseBoton =
    'rounded p-1.5 text-violet-600 transition-colors duration-100 ease-in hover:bg-violet-100 active:bg-violet-200 cursor-pointer disabled:text-gray-300 disabled:hover:bg-transparent disabled:cursor-default';

  return (
    <div className='flex items-center justify-end gap-1 py-2 select-none'>
      <span className='text-sm text-gray-600 whitespace-nowrap pr-2'>
        {cargando ? (
          'Cargando...'
        ) : (
          <>
            {desde.toLocaleString('es-AR')}–{hasta.toLocaleString('es-AR')} de{' '}
            <span className='font-semibold text-gray-800'>{total.toLocaleString('es-AR')}</span>
          </>
        )}
      </span>
      <button
        type='button'
        onClick={() => onCambiarPagina(pagina - 1)}
        disabled={cargando || pagina <= 1}
        title='Pagina anterior'
        className={claseBoton}
      >
        <Chevron hacia='izquierda' />
      </button>
      <button
        type='button'
        onClick={() => onCambiarPagina(pagina + 1)}
        disabled={cargando || pagina >= ultimaPagina}
        title='Pagina siguiente'
        className={claseBoton}
      >
        <Chevron hacia='derecha' />
      </button>
    </div>
  );
}
