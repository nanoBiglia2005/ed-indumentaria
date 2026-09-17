import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { RemitoConDetalles, TIPOS_DE_PAGO } from '@backend/types';
import { ESTADO_CONFIRMADO } from '@backend/types';
import { mensajeDetallesPrimero } from '@/api/cliente';
import { ventasDeCliente } from '@/api/clientesFinales';
import { listarTiposDePago } from '@/api/tiposDePago';
import { useResetAlCambiar } from '@/hooks/useResetAlCambiar';
import RemitoCard from '@/features/ventas/RemitoCard';
import { PARAM_REMITO } from '@/features/ventas/deepLinkRemito';

const TAMANO_PAGINA = 10;

interface VentasDeClienteProps {
  idCliente: number;
}

/**
 * Ventas del cliente abierto en el panel derecho.
 *
 * Reusa RemitoCard tal cual (incluido el precio en efectivo y los totales por
 * metodo de las pendientes, que ya vienen resueltos en el remito): el boton
 * "Ver venta" va al lado de la tarjeta y no adentro para no tener que agregarle
 * un prop de accion mas a un componente que ya lo comparten dos paginas.
 *
 * El destino del link depende del estado: una venta pendiente (CONFIRMADO)
 * vive en Ventas y el resto en Historial — mismo criterio que usa la propia
 * RemitoCard para decidir que muestra.
 */
export default function VentasDeCliente({ idCliente }: VentasDeClienteProps) {
  const navigate = useNavigate();

  const [remitos, setRemitos] = useState<RemitoConDetalles[]>([]);
  const [metodos, setMetodos] = useState<TIPOS_DE_PAGO[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abiertoId, setAbiertoId] = useState<number | null>(null);

  // Otro cliente = otra lista desde cero.
  useResetAlCambiar(idCliente, () => {
    setRemitos([]);
    setTotal(0);
    setPagina(1);
    setCargando(true);
    setError(null);
    setAbiertoId(null);
  });
  useResetAlCambiar(pagina, () => {
    setCargando(true);
    setError(null);
  });

  const secuencia = useRef(0);

  useEffect(() => {
    const peticion = ++secuencia.current;

    ventasDeCliente(idCliente, pagina, TAMANO_PAGINA)
      .then((respuesta) => {
        if (peticion !== secuencia.current) return;
        setRemitos((previos) =>
          pagina === 1 ? respuesta.remitos : [...previos, ...respuesta.remitos]
        );
        setTotal(respuesta.total);
      })
      .catch((err) => {
        if (peticion !== secuencia.current) return;
        console.error('Error al obtener las ventas del cliente:', err);
        setError(mensajeDetallesPrimero(err, 'No se pudieron cargar las ventas del cliente.'));
      })
      .finally(() => {
        if (peticion === secuencia.current) setCargando(false);
      });
  }, [idCliente, pagina]);

  // Solo rotulan los totales por metodo de las ventas pendientes.
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

  const verVenta = (remito: RemitoConDetalles) => {
    const destino = remito.id_estado === ESTADO_CONFIRMADO ? 'ventas' : 'historial';
    navigate(`/gestion/${destino}?${PARAM_REMITO}=${remito.id_remito}`);
  };

  return (
    <section className='mt-6 border-t border-neutro-200 pt-5'>
      <div className='mb-3 flex items-baseline justify-between gap-3'>
        <h3 className='text-lg font-semibold text-neutro-900'>Ventas asociadas a este cliente</h3>
        {!cargando && !error && (
          <span className='text-xs text-neutro-400'>
            {total} {total === 1 ? 'venta' : 'ventas'}
          </span>
        )}
      </div>

      {cargando && remitos.length === 0 && (
        <p className='text-sm text-neutro-400'>Cargando ventas...</p>
      )}

      {!cargando && error && <p className='text-sm text-red-600'>{error}</p>}

      {!cargando && !error && remitos.length === 0 && (
        <p className='text-sm italic text-neutro-400'>Este cliente todavía no tiene ventas.</p>
      )}

      {remitos.length > 0 && (
        <div className='flex flex-col gap-3'>
          {remitos.map((remito) => (
            <div key={remito.id_remito} className='flex items-start gap-2'>
              <div className='min-w-0 flex-1'>
                <RemitoCard
                  remito={remito}
                  metodos={metodos}
                  mostrarCliente={false}
                  abierto={abiertoId === remito.id_remito}
                  onToggle={() =>
                    setAbiertoId((previo) => (previo === remito.id_remito ? null : remito.id_remito))
                  }
                />
              </div>
              <button
                type='button'
                onClick={() => verVenta(remito)}
                className='shrink-0 self-start rounded border mt-3 border-marca-500 px-3 py-1.5 text-sm font-semibold text-marca-600 transition-colors duration-100 ease-in hover:bg-marca-500 hover:text-white cursor-pointer'
              >
                Ver venta
              </button>
            </div>
          ))}
        </div>
      )}

      {remitos.length > 0 && remitos.length < total && (
        <button
          type='button'
          onClick={() => setPagina((previa) => previa + 1)}
          disabled={cargando}
          className='mt-3 rounded px-4 py-2 text-sm font-medium text-neutro-600 bg-neutro-100 transition-colors duration-100 ease-in hover:bg-neutro-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60'
        >
          {cargando ? 'Cargando...' : 'Ver más ventas'}
        </button>
      )}
    </section>
  );
}
