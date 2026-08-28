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

/**
 * Aviso verde de "salio bien". Ocupa lugar siempre (no se desmonta) para poder
 * desvanecerse al irse; `null` es el estado oculto.
 *
 * El mensaje lo maneja hooks/useNotificacion, que lo borra solo.
 */
export default function Notificacion({
  mensaje,
  posicion = 'modal',
}: {
  mensaje: string | null;
  posicion?: Posicion;
}) {
  return (
    <div
      className={`pointer-events-none flex justify-center transition-all duration-200 ease-in-out ${
        POSICION[posicion]
      } ${mensaje ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}
    >
      <span className='rounded-full bg-green-600 px-4 py-1.5 text-sm font-medium text-white shadow-lg'>
        ✓ {mensaje}
      </span>
    </div>
  );
}
