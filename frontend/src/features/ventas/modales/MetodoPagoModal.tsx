import { useEffect, useMemo, useState } from 'react';
import type { ItemPago, MetodoPago, OpcionesDePago, RemitoConDetalles } from '@backend/types';
import BaseModal from '@/components/ui/BaseModal';
import PaymentToggle from '@/components/ui/PaymentToggle';
import { useAccionAsync } from '@/hooks/useAccionAsync';
import { useResetAlCambiar } from '@/hooks/useResetAlCambiar';
import { obtenerOpcionesPago, facturarRemito } from '@/api/remitos';
import { mensajeDetallesPrimero } from '@/api/cliente';
import { estiloLineClamp } from '@/utils/formato';

const MAX_LINEAS_DESCRIPCION = 3;

interface MetodoPagoModalProps {
  abierto: boolean;
  /** Remito pendiente (id_estado = 1) que se va a cobrar. */
  remito: RemitoConDetalles | null;
  onCerrar: () => void;
  onFacturado: (remito: RemitoConDetalles) => void;
}

export default function MetodoPagoModal({
  abierto,
  remito,
  onCerrar,
  onFacturado,
}: MetodoPagoModalProps) {
  const [opciones, setOpciones] = useState<OpcionesDePago | null>(null);
  const [cargando, setCargando] = useState(false);
  // Metodo de pago por linea (id_detalle -> metodo). Lo que falta en el mapa se
  // considera 'efectivo', asi que arranca vacio.
  const [metodos, setMetodos] = useState<Record<number, MetodoPago>>({});
  const {
    cargando: finalizando,
    error,
    setError,
    ejecutar,
  } = useAccionAsync({
    mensajeDe: (err) => mensajeDetallesPrimero(err, 'No se pudo finalizar la venta.'),
  });

  // Reset al llegar un remito distinto (el modal queda montado entre usos).
  useResetAlCambiar(remito, () => {
    setMetodos({});
    setOpciones(null);
    setError(null);
  });

  const id_remito = remito?.id_remito;

  useEffect(() => {
    if (id_remito === undefined) return;

    let cancelado = false;
    setCargando(true);

    obtenerOpcionesPago(id_remito)
      .then((data) => {
        if (cancelado) return;
        setOpciones(data);
        setError(null);
      })
      .catch((err) => {
        if (cancelado) return;
        console.error('Error al obtener las opciones de pago:', err);
        setError(mensajeDetallesPrimero(err, 'No se pudieron cargar los precios.'));
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [id_remito, setError]);

  const items = useMemo(() => opciones?.items ?? [], [opciones]);

  const precioDe = (item: ItemPago) =>
    metodos[item.id_detalle] === 'tarjeta' ? item.precio_tarjeta : item.precio_efectivo;

  const total = useMemo(
    () =>
      items.reduce((acumulado, item) => {
        const precio =
          metodos[item.id_detalle] === 'tarjeta' ? item.precio_tarjeta : item.precio_efectivo;
        return acumulado + precio * item.cantidad;
      }, 0),
    [items, metodos]
  );

  // El toggle general solo se muestra en "Tarjeta" cuando TODAS las lineas lo estan.
  const metodoGeneral: MetodoPago =
    items.length > 0 && items.every((item) => metodos[item.id_detalle] === 'tarjeta')
      ? 'tarjeta'
      : 'efectivo';

  const aplicarATodos = (metodo: MetodoPago) => {
    setMetodos(Object.fromEntries(items.map((item) => [item.id_detalle, metodo])));
  };

  const cambiarMetodo = (id_detalle: number, metodo: MetodoPago) => {
    setMetodos((prev) => ({ ...prev, [id_detalle]: metodo }));
  };

  const handleFinalizarVenta = () => {
    if (!remito || items.length === 0) return;

    ejecutar(async () => {
      const remitoFacturado = await facturarRemito(
        remito.id_remito,
        items.map((item) => ({
          id_detalle: item.id_detalle,
          metodo_pago: metodos[item.id_detalle] ?? 'efectivo',
        }))
      );
      onFacturado(remitoFacturado);
    });
  };

  return (
    <BaseModal
      abierto={abierto}
      onCerrar={finalizando ? () => {} : onCerrar}
      titulo={<>Método de Pago — Remito #{remito?.id_remito}</>}
      claseTitulo='text-xl font-medium leading-6 text-gray-900 mb-4'
      ancho='lg'
      error={error ? { titulo: 'Error al finalizar la venta', detalle: error } : null}
      footer={
        <>
          <button
            onClick={onCerrar}
            disabled={finalizando}
            className='flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-60'
          >
            Cerrar
          </button>
          <button
            onClick={handleFinalizarVenta}
            disabled={finalizando || cargando || items.length === 0}
            className='flex-1 px-4 py-2 cursor-pointer text-sm font-medium text-white bg-violet-600 rounded-md hover:bg-violet-700 disabled:bg-violet-400 transition-colors'
          >
            {finalizando ? 'Finalizando...' : 'Finalizar Venta'}
          </button>
        </>
      }
    >
      <div className='border border-gray-200 rounded-md max-h-72 overflow-y-auto divide-y divide-gray-100'>
        {cargando && <p className='text-sm text-gray-400 px-4 py-3'>Cargando precios...</p>}

        {!cargando && items.length === 0 && (
          <p className='text-sm text-gray-400 italic px-4 py-3'>Sin artículos</p>
        )}

        {!cargando &&
          items.map((item) => (
            <div key={item.id_detalle} className='flex items-center gap-3 px-4 py-2'>
              <div className='flex-1 min-w-0 flex flex-col text-left'>
                <span
                  className='text-md text-gray-800 break-words'
                  style={estiloLineClamp(MAX_LINEAS_DESCRIPCION)}
                >
                  {item.descripcion}
                </span>
                {/* Cambia solo con el toggle de esta linea. */}
                <span className='text-sm font-medium text-gray-500'>{precioDe(item)}$</span>
              </div>

              <div className='w-36 shrink-0'>
                <PaymentToggle
                  compacto
                  valor={metodos[item.id_detalle] ?? 'efectivo'}
                  onChange={(metodo) => cambiarMetodo(item.id_detalle, metodo)}
                />
              </div>

              <span className='w-10 text-center text-sm text-gray-500 shrink-0'>
                x{item.cantidad}
              </span>

              <span className='w-20 text-right text-sm font-medium text-gray-800 shrink-0'>
                {precioDe(item) * item.cantidad}$
              </span>
            </div>
          ))}
      </div>

      <div className='mt-4'>
        <span className='block text-sm font-medium text-gray-700 mb-1'>
          Aplicar a todos los artículos
        </span>
        <PaymentToggle valor={metodoGeneral} onChange={aplicarATodos} />
      </div>

      <div className='mt-5 flex items-center justify-between'>
        <span className='text-md text-gray-500'>Total</span>
        <span className='text-2xl font-semibold text-violet-600'>{total}$</span>
      </div>
    </BaseModal>
  );
}
