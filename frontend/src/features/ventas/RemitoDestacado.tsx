import { useEffect, useRef, useState } from 'react';
import type { RemitoConDetalles, TIPOS_DE_PAGO } from '@backend/types';
import { obtenerRemito } from '@/api/remitos';
import { listarTiposDePago } from '@/api/tiposDePago';
import { useResetAlCambiar } from '@/hooks/useResetAlCambiar';
import RemitoCard from '@/features/ventas/RemitoCard';

interface RemitoDestacadoProps {
  /** Id que llego por `?remito=<id>`. */
  idRemito: number;
  /** Limpia el query param y devuelve la pagina a su vista normal. */
  onCerrar: () => void;
}

/**
 * Venta puntual traida por el deep-link `?remito=<id>`, mostrada ARRIBA de la
 * lista y por fuera de ella: no entra en la paginacion ni la afectan los
 * filtros, es el resultado de una busqueda directa (tipicamente desde la ficha
 * de un cliente).
 *
 * Arranca desplegada porque el motivo de llegar por link es ver el detalle;
 * igual se puede plegar como cualquier otra tarjeta.
 */
export default function RemitoDestacado({ idRemito, onCerrar }: RemitoDestacadoProps) {
  const [remito, setRemito] = useState<RemitoConDetalles | null>(null);
  const [metodos, setMetodos] = useState<TIPOS_DE_PAGO[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(true);

  // Llegar a otra venta con la tarjeta ya montada (otro link, otro id).
  useResetAlCambiar(idRemito, () => {
    setRemito(null);
    setCargando(true);
    setError(null);
    setAbierto(true);
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
          />
        </div>
      )}
    </div>
  );
}
