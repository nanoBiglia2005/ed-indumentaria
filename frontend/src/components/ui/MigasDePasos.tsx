import { Fragment, type ReactNode } from 'react';

export interface MigaPaso {
  clave: string;
  texto: ReactNode;
  /** Volver a este paso para elegir de nuevo. */
  onClick: () => void;
}

interface MigasDePasosProps {
  pasos: MigaPaso[];
  /** Margenes segun donde vaya (el wizard de venta va dentro de un modal). */
  className?: string;
}

/**
 * Migas de un recorrido en cascada: muestran lo elegido en cada paso y
 * permiten volver a cualquiera de ellos para cambiarlo.
 *
 * Salio de AgregarProductoModal al reusarlas la pagina de Precios: los dos
 * recorridos tienen que verse igual.
 */
export default function MigasDePasos({
  pasos,
  className = 'flex items-center gap-2 mt-2 mb-4 text-sm',
}: MigasDePasosProps) {
  return (
    <div className={className}>
      {pasos.map((paso, indice) => (
        <Fragment key={paso.clave}>
          {indice > 0 && <span className='text-gray-300'>›</span>}
          <button
            type='button'
            onClick={paso.onClick}
            className='px-2 py-0.5 rounded border border-violet-500 text-violet-600 cursor-pointer hover:bg-violet-50 transition-colors'
          >
            {paso.texto} ✕
          </button>
        </Fragment>
      ))}
    </div>
  );
}
