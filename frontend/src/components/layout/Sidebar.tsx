import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { ROLES_PRECIOS, ROLES_PRUEBA } from '@backend/types';
import { useCsrfToken, useSession } from '@/context/SessionContext';

type ItemId = 'articulos' | 'precios' | 'ventas' | 'ventas-prueba' | 'configuracion' | 'historial';

/** `roles` ausente = lo ve cualquier usuario logueado. */
const ITEMS: { id: ItemId; ruta: string; nombre: string; icon: ReactNode; roles?: readonly string[] }[] = [
  {
    id: 'articulos',
    ruta: '/gestion/articulos',
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
    id: 'precios',
    ruta: '/gestion/precios',
    nombre: 'Precios',
    roles: ROLES_PRECIOS,
    icon: (
      <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={1.8} className='w-5 h-5'>
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          d='M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581a2.25 2.25 0 003.182 0l4.318-4.318a2.25 2.25 0 000-3.182l-9.581-9.581A2.25 2.25 0 009.568 3z'
        />
        <path strokeLinecap='round' strokeLinejoin='round' d='M6 6h.008v.008H6V6z' />
      </svg>
    ),
  },
  {
    id: 'ventas',
    ruta: '/gestion/ventas',
    nombre: 'Ventas',
    icon: (
      <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={1.8} className='w-5 h-5'>
        <path strokeLinecap='round' strokeLinejoin='round' d='M2.25 12l3-9 3 9m-6 0h6m-6 0l1.5 6h3l1.5-6M15 3v13.5m0 0a2.25 2.25 0 102.25 2.25M15 16.5a2.25 2.25 0 11-2.25 2.25' />
      </svg>
    ),
  },
  {
    // Copia de prueba de Ventas (nuevo alta de venta, con codigo de barras).
    id: 'ventas-prueba',
    ruta: '/gestion/ventas-prueba',
    nombre: 'Ventas (Prueba)',
    roles: ROLES_PRUEBA,
    icon: (
      <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={1.8} className='w-5 h-5'>
        <path strokeLinecap='round' strokeLinejoin='round' d='M3 7V5.25A2.25 2.25 0 015.25 3H7M17 3h1.75A2.25 2.25 0 0121 5.25V7M21 17v1.75A2.25 2.25 0 0118.75 21H17M7 21H5.25A2.25 2.25 0 013 18.75V17' />
        <path strokeLinecap='round' d='M7 7.5v9M10.5 7.5v9M14 7.5v9M17 7.5v9' />
      </svg>
    ),
  },
  {
    id: 'historial',
    ruta: '/gestion/historial',
    nombre: 'Historial',
    icon: (
      <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={1.8} className='w-5 h-5'>
        <path strokeLinecap='round' strokeLinejoin='round' d='M12 8v4l3 3' />
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          d='M3.5 12a8.5 8.5 0 1 0 2.6-6.13M3.5 4v4.5h4.5'
        />
      </svg>
    ),
  },
  {
    id: 'configuracion',
    ruta: '/gestion/configuracion',
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
  const [presionado, setPresionado] = useState<ItemId | null>(null);
  const [expandido, setExpandido] = useState(false);
  const asideRef = useRef<HTMLElement>(null);
  const { user } = useSession();
  const csrfToken = useCsrfToken();

  // Fuera de md la sidebar queda compacta (solo iconos); un click en
  // cualquier parte de ella la expande, y un click afuera la vuelve a cerrar.
  useEffect(() => {
    if (!expandido) return;

    const handleClickFuera = (e: MouseEvent) => {
      if (asideRef.current && !asideRef.current.contains(e.target as Node)) {
        setExpandido(false);
      }
    };

    document.addEventListener('mousedown', handleClickFuera);
    return () => document.removeEventListener('mousedown', handleClickFuera);
  }, [expandido]);

  return (
    <>
      {/* Reserva el espacio en el flujo normal; la sidebar real flota encima */}
      <div className='h-screen w-16 md:w-56 shrink-0' aria-hidden='true' />

      {expandido && (
        <div
          className='fixed inset-0 bg-black/40 z-30 md:hidden'
          onClick={() => setExpandido(false)}
          aria-hidden='true'
        />
      )}

      <aside
        ref={asideRef}
        onClick={() => setExpandido(true)}
        className={`fixed left-0 top-0 z-40 flex flex-col h-screen border-r border-black/10 bg-stone-50 py-10 px-3 gap-10 select-none overflow-hidden transition-[width] duration-200 ease-in-out ${
          expandido ? 'w-56 shadow-xl' : 'w-16'
        } md:w-56`}
      >
        <img src='/img/ED Indumentaria Deportiva.png'></img>
        <nav className='flex flex-col gap-1'>
          {/* Esconder el item es cosmetico: quien corta de verdad es el
              RolGuard de la ruta y, sobre todo, el backend. */}
          {ITEMS.filter((item) => !item.roles || (user?.rol && item.roles.includes(user.rol))).map((item) => {
            const clickeado = presionado === item.id;

            return (
              <NavLink
                key={item.id}
                to={item.ruta}
                onMouseDown={() => setPresionado(item.id)}
                onMouseUp={() => setPresionado(null)}
                onMouseLeave={() => setPresionado(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandido(false);
                }}
                className={({ isActive }) =>
                  `group flex items-center gap-3 px-3 py-2 rounded-lg font-semibold text-sm cursor-pointer
                  transition-all duration-150 ease-in
                  ${clickeado ? 'scale-95' : 'scale-100'}
                  ${expandido ? 'justify-start' : 'justify-center md:justify-start'}
                  ${
                    isActive
                      ? 'bg-violet-500 text-white shadow-md'
                      : 'text-gray-600 hover:bg-amber-100 hover:text-amber-600'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`shrink-0 transition-transform duration-150 ease-in ${
                        isActive ? '' : 'group-hover:scale-110'
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className={`whitespace-nowrap ${expandido ? 'inline' : 'hidden md:inline'}`}>
                      {item.nombre}
                    </span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {user && (
          <div
            onClick={(e) => e.stopPropagation()}
            className={`mt-auto flex flex-col gap-3 border-t border-black/10 pt-4 ${
              expandido ? 'items-start' : 'items-center md:items-start'
            }`}
          >
            <span
              className={`whitespace-nowrap overflow-hidden text-sm font-semibold text-gray-700 ${
                expandido ? 'inline' : 'hidden md:inline'
              }`}
            >
              {user.nombre} {user.apellido}
            </span>
            <form method='POST' action='/auth/signout'>
              <input type='hidden' name='csrfToken' value={csrfToken ?? ''} />
              <input type='hidden' name='callbackUrl' value='/' />
              <button
                type='submit'
                disabled={!csrfToken}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg font-semibold text-sm cursor-pointer text-gray-600 transition-all duration-150 ease-in hover:bg-amber-100 hover:text-amber-600 disabled:opacity-50 ${
                  expandido ? 'justify-start' : 'justify-center md:justify-start'
                }`}
              >
                <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={1.8} className='w-5 h-5 shrink-0'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M18 12H8.25m9.75 0l-3-3m3 3l-3 3'
                  />
                </svg>
                <span className={`whitespace-nowrap ${expandido ? 'inline' : 'hidden md:inline'}`}>Cerrar sesión</span>
              </button>
            </form>
          </div>
        )}
      </aside>
    </>
  );
}

export default Sidebar;
