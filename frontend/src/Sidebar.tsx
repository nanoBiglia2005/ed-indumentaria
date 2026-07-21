import { useState, type ReactNode } from 'react';

type ItemId = 'articulos' | 'ventas' | 'proveedores' | 'configuracion';

const ITEMS: { id: ItemId; nombre: string; icon: ReactNode }[] = [
  {
    id: 'articulos',
    nombre: 'Articulos',
    icon: (
      <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={1.8} className='w-5 h-5'>
        <path strokeLinecap='round' strokeLinejoin='round' d='M20.25 7.5l-8.25-4.5-8.25 4.5 8.25 4.5 8.25-4.5z' />
        <path strokeLinecap='round' strokeLinejoin='round' d='M3.75 7.5v9l8.25 4.5 8.25-4.5v-9' />
        <path strokeLinecap='round' strokeLinejoin='round' d='M12 12v9' />
      </svg>
    ),
  },
  {
    id: 'ventas',
    nombre: 'Ventas',
    icon: (
      <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={1.8} className='w-5 h-5'>
        <path strokeLinecap='round' strokeLinejoin='round' d='M2.25 12l3-9 3 9m-6 0h6m-6 0l1.5 6h3l1.5-6M15 3v13.5m0 0a2.25 2.25 0 102.25 2.25M15 16.5a2.25 2.25 0 11-2.25 2.25' />
      </svg>
    ),
  },
  {
    id: 'configuracion',
    nombre: 'Configuración',
    icon: (
      <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={1.8} className='w-5 h-5'>
        <path strokeLinecap='round' strokeLinejoin='round' d='M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.041.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.38.137.752.43.992l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.127c-.331.183-.581.495-.644.869l-.213 1.281c-.09.542-.56.94-1.11.94h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a7.65 7.65 0 010-.255c.007-.38-.138-.752-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.127.332-.184.582-.496.644-.87l.213-1.28z' />
        <path strokeLinecap='round' strokeLinejoin='round' d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' />
      </svg>
    ),
  },
];

function Sidebar() {
  const [seleccionado, setSeleccionado] = useState<ItemId>('articulos');
  const [presionado, setPresionado] = useState<ItemId | null>(null);

  return (
    <aside className='flex-col h-screen w-56 shrink-0 border-r border-black/10 bg-stone-50 py-10 px-3 gap-10 hidden md:flex select-none'>
      <nav className='flex flex-col gap-1'>
        {ITEMS.map((item) => {
          const activo = seleccionado === item.id;
          const clickeado = presionado === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setSeleccionado(item.id)}
              onMouseDown={() => setPresionado(item.id)}
              onMouseUp={() => setPresionado(null)}
              onMouseLeave={() => setPresionado(null)}
              className={`group flex items-center gap-3 px-3 py-2 rounded-lg font-semibold text-sm cursor-pointer
                transition-all duration-150 ease-in
                ${clickeado ? 'scale-95' : 'scale-100'}
                ${
                  activo
                    ? 'bg-violet-500 text-white shadow-md'
                    : 'text-gray-600 hover:bg-amber-100 hover:text-amber-600'
                }`}
            >
              <span
                className={`transition-transform duration-150 ease-in ${
                  activo ? '' : 'group-hover:scale-110'
                }`}
              >
                {item.icon}
              </span>
              <span>{item.nombre}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;
