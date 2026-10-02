import BaseModal from '@/components/ui/BaseModal';
import { mensajeDetallesPrimero } from '@/api/cliente';
import { eliminarReporte } from '@/api/reportes';
import { useAccionAsync } from '@/hooks/useAccionAsync';
import { useCuentaRegresiva } from '@/hooks/useCuentaRegresiva';
import { useResetAlCambiar } from '@/hooks/useResetAlCambiar';
import { formatearFechaHora } from '@/utils/formato';
import { ETIQUETAS_TIPO_REPORTE, resumenParametros } from '@/utils/reportes';
import type { ReporteGuardado } from '@/types/reportes';

interface EliminarReporteModalProps {
  abierto: boolean;
  reporte: ReporteGuardado | null;
  onCerrar: () => void;
  onEliminado: () => void;
}

/** Borra un reporte guardado (fila + PDF), con la espera de las acciones destructivas. */
export default function EliminarReporteModal({ abierto, reporte, onCerrar, onEliminado }: EliminarReporteModalProps) {
  const { cargando, error, setError, ejecutar } = useAccionAsync({
    mensajeDe: (err) => mensajeDetallesPrimero(err, 'No se pudo eliminar el reporte.'),
  });
  const segundos = useCuentaRegresiva(abierto);
  useResetAlCambiar(reporte, () => setError(null));

  const esperando = segundos > 0;

  const handleEliminar = () => {
    if (!reporte || esperando) return;
    ejecutar(async () => {
      await eliminarReporte(reporte.id_reporte);
      onEliminado();
    });
  };

  return (
    <BaseModal
      abierto={abierto}
      onCerrar={cargando ? () => {} : onCerrar}
      titulo='Eliminar Reporte'
      colorTitulo='text-red-600'
      error={error ? { titulo: 'No se pudo eliminar', detalle: error } : null}
      footer={
        <>
          <button
            type='button'
            onClick={onCerrar}
            disabled={cargando}
            className='flex-1 px-4 py-2 text-sm font-medium text-neutro-600 bg-neutro-100 rounded hover:bg-neutro-200 transition-colors cursor-pointer disabled:opacity-60'
          >
            Cancelar
          </button>
          <button
            type='button'
            onClick={handleEliminar}
            disabled={esperando || cargando}
            className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded transition-colors ${
              esperando || cargando ? 'bg-red-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 cursor-pointer'
            }`}
          >
            {cargando ? 'Eliminando...' : esperando ? `Eliminar (${segundos})` : 'Eliminar'}
          </button>
        </>
      }
    >
      {reporte && (
        <p className='text-sm text-neutro-600'>
          Se va a eliminar el reporte{' '}
          <span className='font-semibold text-neutro-900'>{ETIQUETAS_TIPO_REPORTE[reporte.tipo]}</span> del{' '}
          {formatearFechaHora(reporte.fecha_generado)} ({resumenParametros(reporte.parametros)}). El PDF deja de
          estar disponible y esta acción no se puede deshacer.
        </p>
      )}
    </BaseModal>
  );
}
