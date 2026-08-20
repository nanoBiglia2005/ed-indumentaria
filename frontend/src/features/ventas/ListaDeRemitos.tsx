import { useEffect, useState } from 'react';
import type { RemitoConDetalles, TIPOS_DE_PAGO } from '@backend/types';
import { listarTiposDePago } from '@/api/tiposDePago';
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
  // Los metodos se piden una sola vez para toda la lista: cada tarjeta los
  // necesita solo para poner el nombre al lado de cada total.
  const [metodos, setMetodos] = useState<TIPOS_DE_PAGO[]>([]);

  useEffect(() => {
    let cancelado = false;

    listarTiposDePago()
      .then((data) => {
        if (!cancelado) setMetodos([...data].sort((a, b) => a.id_tipos_de_pago - b.id_tipos_de_pago));
      })
      .catch((err) => console.error('Error al obtener los tipos de pago:', err));

    return () => {
      cancelado = true;
    };
  }, []);

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
            <RemitoCard
              key={remito.id_remito}
              remito={remito}
              metodos={metodos}
              onPagar={onPagar}
              onAnular={onAnular}
            />
          ))}
        </div>
      )}
    </>
  );
}
