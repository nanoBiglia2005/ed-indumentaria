import { useEffect, useRef, useState } from 'react';
import type { RemitoConDetalles, TIPOS_DE_PAGO } from '@backend/types';
import { ESTADO_CONFIRMADO } from '@backend/types';
import { obtenerRemito } from '@/api/remitos';
import { listarTiposDePago } from '@/api/tiposDePago';
import { useResetAlCambiar } from '@/hooks/useResetAlCambiar';
import RemitoCard from '@/features/ventas/RemitoCard';
import DetalleRemitoModal from '@/features/ventas/modales/DetalleRemitoModal';
import ReimprimirRemitoModal from '@/features/ventas/modales/ReimprimirRemitoModal';

interface RemitoDestacadoProps {
  /** Id que llego por `?remito=<id>`. */
  idRemito: number;
  /** Limpia el query param y devuelve la pagina a su vista normal. */
  onCerrar: () => void;
  /** Acciones de una venta PENDIENTE (la usa VentasPage). */
  onPagar?: (remito: RemitoConDetalles) => void;
  onAnular?: (remito: RemitoConDetalles) => void;
  /** Accion de una venta FACTURADA (la usa HistorialPage). */
  onDevolver?: (remito: RemitoConDetalles) => void;
}

/**
 * Venta puntual traida por el deep-link `?remito=<id>`, tipicamente por el
 * boton "Ver venta" de la ficha de un cliente (ver VentasDeCliente.tsx).
 *
 * Una venta PENDIENTE (CONFIRMADO) se muestra como la tarjeta "Venta buscada"
 * de siempre, ARRIBA de la lista y por fuera de ella (no entra en la
 * paginacion ni la afectan los filtros), con sus acciones (Pagar/Anular/
 * Reimprimir) ya cableadas — antes esta tarjeta no tenia ninguna accion.
 *
 * Cualquier otro estado (FACTURADA/ANULADA/DEVUELTA) no tiene sentido
 * mostrarlo como tarjeta plegable: es una venta cerrada que se consulta
 * entera, asi que en vez de la tarjeta se abre DIRECTAMENTE
 * DetalleRemitoModal, igual que si se hubiera clickeado esa misma venta en el
 * Historial. Cerrar el modal limpia el query param (no queda nada mas que
 * mostrar por fuera de la lista).
 */
export default function RemitoDestacado({
  idRemito,
  onCerrar,
  onPagar,
  onAnular,
  onDevolver,
}: RemitoDestacadoProps) {
  const [remito, setRemito] = useState<RemitoConDetalles | null>(null);
  const [metodos, setMetodos] = useState<TIPOS_DE_PAGO[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(true);

  // Reimprimir es la unica accion que comparten las dos ramas (tarjeta
  // pendiente y modal de detalle): vive aca, no duplicada en cada una.
  const [remitoAReimprimir, setRemitoAReimprimir] = useState<RemitoConDetalles | null>(null);

  // Llegar a otra venta con la tarjeta ya montada (otro link, otro id).
  useResetAlCambiar(idRemito, () => {
    setRemito(null);
    setCargando(true);
    setError(null);
    setAbierto(true);
    setRemitoAReimprimir(null);
  });

  // Las respuestas pueden llegar desordenadas: solo vale la ultima pedida.
  const secuencia = useRef(0);

  useEffect(() => {
    const peticion = ++secuencia.current;

    obtenerRemito(idRemito)
      .then((encontrado) => {
        if (peticion !== secuencia.current) return;
        setRemito(encontrado);
      })
      .catch((err) => {
        if (peticion !== secuencia.current) return;
        console.error('Error al obtener la venta:', err);
        setError('No se pudo encontrar esa venta.');
      })
      .finally(() => {
        if (peticion === secuencia.current) setCargando(false);
      });
  }, [idRemito]);

  // Los metodos solo rotulan los totales de una venta pendiente.
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

  // Una venta cerrada no tiene tarjeta "Venta buscada": se abre directo en
  // DetalleRemitoModal, y cerrarlo limpia el deep-link (no hay nada mas que
  // mostrar fuera de la lista).
  if (!cargando && !error && remito && remito.id_estado !== ESTADO_CONFIRMADO) {
    return (
      <>
        <DetalleRemitoModal
          abierto
          onCerrar={onCerrar}
          remito={remito}
          metodos={metodos}
          // Cierra el deep-link ANTES de devolver: si no, el modal se queda
          // abierto mostrando el estado viejo (FACTURADA) mientras la lista de
          // atras ya recargo con la venta DEVUELTA.
          onDevolver={
            onDevolver &&
            ((remitoADevolver) => {
              onCerrar();
              onDevolver(remitoADevolver);
            })
          }
          onReimprimir={setRemitoAReimprimir}
        />

        <ReimprimirRemitoModal
          abierto={remitoAReimprimir !== null}
          onCerrar={() => setRemitoAReimprimir(null)}
          remito={remitoAReimprimir}
        />
      </>
    );
  }

  return (
    <div className='mb-4 w-full shrink-0 rounded border border-marca-500 bg-marca-50 p-3'>
      <div className='mb-2 flex items-center justify-between gap-3'>
        <span className='text-sm font-semibold text-marca-700'>Venta buscada</span>
        <button
          type='button'
          onClick={onCerrar}
          className='rounded px-3 py-1 text-sm font-medium text-neutro-600 bg-neutro-100 transition-colors duration-100 ease-in hover:bg-neutro-200 cursor-pointer'
        >
          Cerrar
        </button>
      </div>

      {cargando && <p className='text-sm text-neutro-400'>Cargando la venta...</p>}

      {!cargando && error && <p className='text-sm text-red-600'>{error}</p>}

      {!cargando && !error && remito && (
        <div className='bg-white'>
          <RemitoCard
            remito={remito}
            metodos={metodos}
            abierto={abierto}
            onToggle={() => setAbierto((previo) => !previo)}
            onPagar={onPagar}
            onAnular={onAnular}
            onReimprimir={setRemitoAReimprimir}
          />
        </div>
      )}

      <ReimprimirRemitoModal
        abierto={remitoAReimprimir !== null}
        onCerrar={() => setRemitoAReimprimir(null)}
        remito={remitoAReimprimir}
      />
    </div>
  );
}
