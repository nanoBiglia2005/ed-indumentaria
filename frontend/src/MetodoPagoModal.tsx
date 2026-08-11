import { useEffect, useMemo, useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import type { ItemPago, MetodoPago, OpcionesDePago, RemitoConDetalles } from '../../backend/types';
import PaymentToggle from './PaymentToggle';

const MAX_LINEAS_DESCRIPCION = 3;

interface MetodoPagoModalProps {
  /** Remito pendiente (id_estado = 1) que se va a cobrar. */
  remito: RemitoConDetalles | null;
  onClose: () => void;
  onFacturado: (remito: RemitoConDetalles) => void;
}

export default function MetodoPagoModal({ remito, onClose, onFacturado }: MetodoPagoModalProps) {
  const [opciones, setOpciones] = useState<OpcionesDePago | null>(null);
  const [cargando, setCargando] = useState(false);
  // Metodo de pago por linea (id_detalle -> metodo). Lo que falta en el mapa se
  // considera 'efectivo', asi que arranca vacio.
  const [metodos, setMetodos] = useState<Record<number, MetodoPago>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset al llegar un remito distinto, ajustando el estado durante el render en
  // vez de con un efecto (evita el re-render en cascada).
  const [remitoAnterior, setRemitoAnterior] = useState(remito);
  if (remito !== remitoAnterior) {
    setRemitoAnterior(remito);
    setMetodos({});
    setOpciones(null);
    setError(null);
  }

  const id_remito = remito?.id_remito;

  useEffect(() => {
    if (id_remito === undefined) return;

    let cancelado = false;
    setCargando(true);

    fetch(`/api/remitos/${id_remito}/opciones-pago`)
      .then(async (respuesta) => {
        const data = await respuesta.json();
        if (!respuesta.ok) throw new Error(data.details || data.message);
        return data as OpcionesDePago;
      })
      .then((data) => {
        if (cancelado) return;
        setOpciones(data);
        setError(null);
      })
      .catch((err) => {
        if (cancelado) return;
        console.error('Error al obtener las opciones de pago:', err);
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los precios.');
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [id_remito]);

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

  const handleFinalizarVenta = async () => {
    if (!remito || items.length === 0) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/remitos/${remito.id_remito}/facturar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pagos: items.map((item) => ({
            id_detalle: item.id_detalle,
            metodo_pago: metodos[item.id_detalle] ?? 'efectivo',
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.message);
      }

      onFacturado(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo finalizar la venta.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Transition appear show={remito !== null} as={Fragment}>
      <Dialog as='div' className='relative z-50' onClose={isLoading ? () => {} : onClose}>
        <Transition.Child
          as={Fragment}
          enter='ease-out duration-100'
          enterFrom='opacity-0'
          enterTo='opacity-100'
          leave='ease-in duration-100'
          leaveFrom='opacity-100'
          leaveTo='opacity-0'
        >
          <div className='fixed inset-0 bg-black/25' />
        </Transition.Child>

        <div className='fixed inset-0 overflow-y-auto'>
          <div className='flex min-h-full items-center justify-center p-4 text-center'>
            <Transition.Child
              as={Fragment}
              enter='ease-out duration-100'
              enterFrom='opacity-0 scale-95'
              enterTo='opacity-100 scale-100'
              leave='ease-in duration-100'
              leaveFrom='opacity-100 scale-100'
              leaveTo='opacity-0 scale-95'
            >
              <Dialog.Panel className='w-full max-w-lg transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all'>
                <Dialog.Title as='h3' className='text-xl font-medium leading-6 text-gray-900 mb-4'>
                  Método de Pago — Remito #{remito?.id_remito}
                </Dialog.Title>

                {error && (
                  <div className='mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex flex-col'>
                    <span>Error al finalizar la venta</span>
                    <span className='text-red-500 text-xs'>{error}</span>
                  </div>
                )}

                <div className='border border-gray-200 rounded-md max-h-72 overflow-y-auto divide-y divide-gray-100'>
                  {cargando && (
                    <p className='text-sm text-gray-400 px-4 py-3'>Cargando precios...</p>
                  )}

                  {!cargando && items.length === 0 && (
                    <p className='text-sm text-gray-400 italic px-4 py-3'>Sin artículos</p>
                  )}

                  {!cargando &&
                    items.map((item) => (
                      <div key={item.id_detalle} className='flex items-center gap-3 px-4 py-2'>
                        <div className='flex-1 min-w-0 flex flex-col text-left'>
                          <span
                            className='text-md text-gray-800 break-words'
                            style={{
                              display: '-webkit-box',
                              WebkitLineClamp: MAX_LINEAS_DESCRIPCION,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
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

                <div className='mt-6 flex gap-3'>
                  <button
                    onClick={onClose}
                    disabled={isLoading}
                    className='flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-60'
                  >
                    Cerrar
                  </button>
                  <button
                    onClick={handleFinalizarVenta}
                    disabled={isLoading || cargando || items.length === 0}
                    className='flex-1 px-4 py-2 cursor-pointer text-sm font-medium text-white bg-violet-600 rounded-md hover:bg-violet-700 disabled:bg-violet-400 transition-colors'
                  >
                    {isLoading ? 'Finalizando...' : 'Finalizar Venta'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
