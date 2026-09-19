import type { TipoNotificacion } from '@/hooks/useNotificacion';

/**
 * Donde se para el aviso. Las dos posiciones existen porque el aviso se usa en
 * los dos contextos y no se ven igual:
 *  - `modal`: dentro del panel de un BaseModal (que tiene que ir con
 *    `clasePanel='relative'`), cerca de su titulo.
 *  - `pagina`: flotando sobre la pagina, a la vista aunque este scrolleada.
 */
type Posicion = 'modal' | 'pagina';

const POSICION: Record<Posicion, string> = {
  modal: 'absolute inset-x-0 top-3',
  pagina: 'fixed inset-x-0 top-6 z-50',
};

// Colores semanticos literales (verde exito / rojo error): no tienen token de
// marca, van escritos tal cual (ver CLAUDE.md, Identidad Visual).
const ESTILO: Record<TipoNotificacion, { fondo: string; icono: string }> = {
  exito: { fondo: 'bg-green-600', icono: '✓' },
  error: { fondo: 'bg-red-600', icono: '✕' },
};

/**
 * Aviso breve de "salio bien" (verde, tilde) o "esto no se pudo" (rojo, cruz).
 * Ocupa lugar siempre (no se desmonta) para poder desvanecerse al irse; `null`
 * es el estado oculto.
 *
 * El mensaje y el tipo los maneja hooks/useNotificacion, que los borra solos.
 */
export default function Notificacion({
  mensaje,
  posicion = 'modal',
  tipo = 'exito',
}: {
  mensaje: string | null;
  posicion?: Posicion;
  tipo?: TipoNotificacion;
}) {
  const estilo = ESTILO[tipo];

  return (
    <div
      className={`pointer-events-none flex justify-center transition-all duration-200 ease-in-out ${
        POSICION[posicion]
      } ${mensaje ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}
    >
      <span
        className={`rounded-full ${estilo.fondo} px-4 py-1.5 text-sm font-medium text-white shadow-sm`}
      >
        {estilo.icono} {mensaje}
      </span>
    </div>
  );
}
