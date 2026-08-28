import type { RemitoConDetalles } from '@backend/types';
import BaseModal from '@/components/ui/BaseModal';
import { useAccionAsync } from '@/hooks/useAccionAsync';
import { useCuentaRegresiva } from '@/hooks/useCuentaRegresiva';
import { useResetAlCambiar } from '@/hooks/useResetAlCambiar';
import { mensajeDetallesPrimero } from '@/api/cliente';
import type { AccionDeRemito } from './accionesDeRemito';
import { formatearPesos } from '@/utils/formato';

const SEGUNDOS_DE_ESPERA = 5;

// Un juego de clases por tono, enteras: Tailwind escanea nombres de clase
// completos, asi que armarlas con `'bg-' + color` no generaria ninguna.

interface ConfirmarAccionRemitoModalProps {
  abierto: boolean;
  remito: RemitoConDetalles | null;
  /** Que accion se confirma: ACCION_ANULAR / ACCION_DEVOLVER. */
  accion: AccionDeRemito;
  onCerrar: () => void;
  onHecho: (remito: RemitoConDetalles) => void;
}

/**
 * Confirmacion de una accion irreversible sobre un remito, con una espera de
 * 5 segundos antes de habilitar el boton.
 *
 * Es uno solo para todas: lo que cambia entre anular y devolver son textos y la
 * llamada a la api, asi que se pasan como un objeto (misma idea que
 * EditRelacionesModal) en vez de tener un modal por accion.
 */
export default function ConfirmarAccionRemitoModal({
  abierto,
  remito,
  accion,
  onCerrar,
  onHecho,
}: ConfirmarAccionRemitoModalProps) {
  const { cargando, error, setError, ejecutar } = useAccionAsync({
    mensajeDe: (err) => mensajeDetallesPrimero(err, accion.mensajeError),
  });
  // Cuenta regresiva antes de habilitar la accion.
  const segundos = useCuentaRegresiva(abierto, SEGUNDOS_DE_ESPERA);

  // Reset al llegar un remito distinto (el modal queda montado entre usos).
  useResetAlCambiar(remito, () => setError(null));

  const handleConfirmar = () => {
    if (!remito || segundos > 0) return;

    ejecutar(async () => {
      onHecho(await accion.ejecutar(remito.id_remito));
    });
  };

  const esperando = segundos > 0;

  return (
    <BaseModal
      abierto={abierto}
      onCerrar={cargando ? () => {} : onCerrar}
      titulo={accion.titulo}
      colorTitulo={'text-red-600'}
      z='z-[60]'
      error={error ? { titulo: accion.tituloError, detalle: error } : null}
      footer={
        <>
          <button
            onClick={onCerrar}
            disabled={cargando}
            className='flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-60'
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={esperando || cargando}
            className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${
              esperando || cargando ? 'bg-red-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 cursor-pointer '
            }`}
          >
            {cargando
              ? accion.verboEnCurso
              : esperando
              ? `${accion.verbo} (${segundos})`
              : accion.verbo}
          </button>
        </>
      }
    >
      <p className='text-sm text-gray-700'>
        {accion.descripcion} <span className='font-semibold'>#{remito?.cod_mes}-{remito?.cod_remito_final}</span> por{' '}
        <span className='font-semibold'>{formatearPesos(remito ? accion.monto(remito) : 0)}</span>. Esta acción no
        se puede deshacer.
      </p>
    </BaseModal>
  );
}
