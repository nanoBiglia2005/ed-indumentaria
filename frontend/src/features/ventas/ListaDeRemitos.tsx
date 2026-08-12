import type { RemitoConDetalles } from '@backend/types';
import RemitoCard from '@/features/ventas/RemitoCard';

/**
 * Lista de remitos con sus tres estados (cargando / error / vacio), compartida
 * por VentasPage (pendientes, con acciones) e HistorialPage (historial).
 */
interface ListaDeRemitosProps {
  remitos: RemitoConDetalles[];
  cargando: boolean;
  error: string | null;
  textoCargando: string;
  textoVacio: string;
  /** VentasPage estira los estados y la lista a todo el ancho. */
  anchoCompleto?: boolean;
  onPagar?: (remito: RemitoConDetalles) => void;
  onAnular?: (remito: RemitoConDetalles) => void;
}

export default function ListaDeRemitos({
  remitos,
  cargando,
  error,
  textoCargando,
  textoVacio,
  anchoCompleto = false,
  onPagar,
  onAnular,
}: ListaDeRemitosProps) {
  const claseEstado = anchoCompleto ? ' w-full' : '';

  return (
    <>
      {cargando && <span className={`text-gray-400${claseEstado}`}>{textoCargando}</span>}

      {!cargando && error && <span className={`text-red-500${claseEstado}`}>{error}</span>}

      {!cargando && !error && remitos.length === 0 && (
        <span className={`text-gray-400${claseEstado}`}>{textoVacio}</span>
      )}

      {!cargando && !error && remitos.length > 0 && (
        <div
          className={`flex flex-col gap-3${anchoCompleto ? ' w-full' : ''} flex-1 min-h-0 overflow-y-auto pr-1 pb-6`}
        >
          {remitos.map((remito) => (
            <RemitoCard key={remito.id_remito} remito={remito} onPagar={onPagar} onAnular={onAnular} />
          ))}
        </div>
      )}
    </>
  );
}
