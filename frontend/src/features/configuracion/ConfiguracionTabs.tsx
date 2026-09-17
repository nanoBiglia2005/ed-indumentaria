import type { TabConfiguracion, TabConfiguracionId } from '@/features/configuracion/tabsConfiguracion';

interface ConfiguracionTabsProps {
  tabs: readonly TabConfiguracion[];
  activo: TabConfiguracionId;
  onSeleccionar: (id: TabConfiguracionId) => void;
}

/**
 * Menu horizontal de pestañas de la pagina de Configuracion.
 *
 * Usa los mismos colores de navegacion que la Sidebar (activo `bg-marca-500`,
 * hover `bg-marca-50`): es un menu de navegacion, no una lista de datos, asi que
 * el hover de marca es intencional y no cae bajo la regla del hover neutro.
 *
 * Fuera de `sm` solo se lee la leyenda del tab activo; el resto queda como icono
 * para que la barra entre completa en pantallas chicas.
 */
export default function ConfiguracionTabs({ tabs, activo, onSeleccionar }: ConfiguracionTabsProps) {
  return (
    <div
      role='tablist'
      aria-label='Secciones de configuración'
      className='mb-8 flex w-full flex-wrap items-center gap-1 border-b border-neutro-200 pb-2'
    >
      {tabs.map((tab) => {
        const esActivo = tab.id === activo;

        return (
          <button
            key={tab.id}
            type='button'
            role='tab'
            aria-selected={esActivo}
            title={tab.nombre}
            onClick={() => onSeleccionar(tab.id)}
            className={`group flex cursor-pointer items-center gap-2 rounded px-3 py-2 text-sm font-semibold transition-all duration-150 ease-in ${
              esActivo ? 'bg-marca-500 text-white' : 'text-neutro-600 hover:bg-marca-50 hover:text-marca-700'
            }`}
          >
            <span
              className={`shrink-0 transition-transform duration-150 ease-in ${
                esActivo ? '' : 'group-hover:scale-110'
              }`}
            >
              {tab.icono}
            </span>
            <span className={`whitespace-nowrap ${esActivo ? 'inline' : 'hidden sm:inline'}`}>
              {tab.nombre}
            </span>
          </button>
        );
      })}
    </div>
  );
}
