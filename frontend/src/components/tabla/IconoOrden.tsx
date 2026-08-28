export default function IconoOrden({ direccion }: { direccion: 'asc' | 'desc' | null }) {
  if (direccion === 'asc') {
    return (
      <svg className='h-3.5 w-3.5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2}>
        <path strokeLinecap='round' strokeLinejoin='round' d='M12 19V5m0 0l-5 5m5-5l5 5' />
      </svg>
    );
  }
  if (direccion === 'desc') {
    return (
      <svg className='h-3.5 w-3.5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2}>
        <path strokeLinecap='round' strokeLinejoin='round' d='M12 5v14m0 0l-5-5m5 5l5-5' />
      </svg>
    );
  }
  return (
    <svg className='h-3.5 w-3.5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2}>
      <path strokeLinecap='round' strokeLinejoin='round' d='M8 9l4-4 4 4M16 15l-4 4-4-4' />
    </svg>
  );
}
