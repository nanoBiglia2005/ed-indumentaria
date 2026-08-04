import { useMemo, useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import type { ARTICULOS } from '../../backend/generated/prisma/client';
import type { VentaImpresa } from '../../backend/types';
import AgregarProductoModal from './AgregarProductoModal';

const MAX_LINEAS_DESCRIPCION = 3;

interface ProductoSeleccionado {
  articulo: ARTICULOS;
  cantidad: number | null;
}

interface NuevaVentaModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Se imprimio el ticket; todavia no se registro nada. Sigue el paso de pago. */
  onVentaImpresa: (venta: VentaImpresa) => void;
}

export default function NuevaVentaModal({ isOpen, onClose, onVentaImpresa }: NuevaVentaModalProps) {
  const [productos, setProductos] = useState<ProductoSeleccionado[]>([]);
  const [isAgregarOpen, setIsAgregarOpen] = useState(false);
  // Cual de los dos botones de confirmar esta en curso (null = ninguno).
  const [accionEnCurso, setAccionEnCurso] = useState<'con-impresion' | 'sin-impresion' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isLoading = accionEnCurso !== null;

  const resetForm = () => {
    setProductos([]);
    setError(null);
  };

  const handleClose = () => {
    if (isLoading) return;
    resetForm();
    onClose();
  };

  // Precios sin redondear: el redondeo comercial lo aplica el backend al confirmar.
  const totalVenta = useMemo(
    () => productos.reduce((acumulado, p) => acumulado + p.articulo.precio * (p.cantidad ?? 0), 0),
    [productos]
  );

  const articulosExcluidos = useMemo(
    () => productos.map((p) => p.articulo.id_articulo),
    [productos]
  );

  const handleAgregarProducto = (articulo: ARTICULOS) => {
    setProductos((prev) => [...prev, { articulo, cantidad: 1 }]);
    setError(null);
  };

  const handleCantidadChange = (id_articulo: number, valor: string) => {
    const cantidad = valor === '' ? null : Math.trunc(Number(valor));
    setProductos((prev) =>
      prev.map((p) => (p.articulo.id_articulo === id_articulo ? { ...p, cantidad } : p))
    );
  };

  const handleQuitarProducto = (id_articulo: number) => {
    setProductos((prev) => prev.filter((p) => p.articulo.id_articulo !== id_articulo));
  };

  const handleConfirmar = async (imprimir: boolean) => {
    if (productos.length === 0) {
      setError('Agregá al menos un artículo a la venta.');
      return;
    }

    const productoInvalido = productos.find(
      (p) => p.cantidad === null || !Number.isInteger(p.cantidad) || p.cantidad <= 0
    );
    if (productoInvalido) {
      setError(
        `La cantidad de "${productoInvalido.articulo.descripcion ?? 'un artículo'}" debe ser un número entero mayor a 0.`
      );
      return;
    }

    try {
      setAccionEnCurso(imprimir ? 'con-impresion' : 'sin-impresion');
      setError(null);

      // Calcula los precios y, si corresponde, imprime el ticket con los dos
      // valores. La venta se registra recien en el paso del metodo de pago.
      const response = await fetch('/api/remitos/preparar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imprimir,
          detalles: productos.map((p) => ({
            id_articulo: p.articulo.id_articulo,
            cantidad: p.cantidad,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.message);
      }

      const ventaImpresa: VentaImpresa = await response.json();
      resetForm();
      onVentaImpresa(ventaImpresa);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo preparar la venta.');
    } finally {
      setAccionEnCurso(null);
    }
  };

  return (
    <>
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as='div' className='relative z-50' onClose={handleClose}>
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

          <div className='fixed inset-0 overflow-y-auto select-none'>
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
                  <div className='flex items-start justify-between mb-4 gap-4'>
                    <Dialog.Title as='h3' className='text-xl font-medium leading-6 text-gray-900'>
                      Nueva Venta
                    </Dialog.Title>
                  </div>

                  {error && (
                    <div className='mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex flex-col'>
                      <span>Error al registrar la venta</span>
                      <span className='text-red-500 text-xs'>{error}</span>
                    </div>
                  )}

                  <div className='flex items-center mb-2 justify-between'>
                    <div className='flex gap-5 items-center'>
                    <span className='text-lg font-medium text-gray-700'>Artículos</span>
                    <button
                      type='button'
                      onClick={() => setIsAgregarOpen(true)}
                      className='text-md px-3 py-1.5 border border-violet-600 text-violet-600 rounded hover:bg-violet-500 hover:text-white transition-colors cursor-pointer'
                    >
                      Agregar Producto
                    </button>
                    </div>
                    <div className='flex flex-col items-end shrink-0'>
                      <span className='text-md text-gray-500'>Total</span>
                      <span className='text-2xl font-semibold text-violet-600'>{totalVenta}$</span>
                    </div>
                  </div>

                  <div className='border border-gray-200 rounded-md max-h-72 overflow-y-auto divide-y divide-gray-100'>
                    {productos.length === 0 ? (
                      <p className='text-sm text-gray-400 italic px-4 py-3'>No hay artículos agregados</p>
                    ) : (
                      productos.map(({ articulo, cantidad }) => (
                        <div key={articulo.id_articulo} className='flex items-center gap-3 px-4 py-2'>
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
                              {articulo.descripcion ?? 'Sin Nombre'}
                            </span>
                            <span className='text-sm font-medium text-gray-500'>{articulo.precio}$</span>
                          </div>
                          <input
                            type='number'
                            min={1}
                            step={1}
                            value={cantidad === null ? '' : cantidad}
                            onChange={(e) => handleCantidadChange(articulo.id_articulo, e.target.value)}
                            className='w-16 px-2 py-1 text-sm border border-gray-300 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-violet-500'
                          />
                          <span className='w-15 text-right text-sm font-medium text-gray-800 shrink-0'>
                            {(articulo.precio * (cantidad ?? 0)).toFixed(2)}$
                          </span>
                          <button
                            type='button'
                            onClick={() => handleQuitarProducto(articulo.id_articulo)}
                            className='font-bold text-gray-400 hover:text-red-600 cursor-pointer px-1 shrink-0'
                          >
                            X
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <div className='mt-8 flex flex-col gap-3'>
                    <button
                      onClick={() => handleConfirmar(true)}
                      disabled={isLoading}
                      className='flex-1 px-3 py-2 cursor-pointer text-sm font-medium text-white bg-violet-600 rounded-md hover:bg-violet-700 disabled:bg-violet-400 transition-colors'
                    >
                      {accionEnCurso === 'con-impresion' ? 'Imprimiendo...' : 'Confirmar e Imprimir'}
                    </button>
                    <button
                      onClick={() => handleConfirmar(false)}
                      disabled={isLoading}
                      className='flex-1 px-3 py-2 cursor-pointer text-sm font-medium text-black border hover:bg-amber-50 rounded-md disabled:opacity-60 transition-colors'
                    >
                      {accionEnCurso === 'sin-impresion' ? 'Preparando...' : 'Confirmar Sin Imprimir'}
                    </button>
                    <button
                      onClick={handleClose}
                      disabled={isLoading}
                      className='flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-60'
                    >
                      Cerrar
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      <AgregarProductoModal
        isOpen={isAgregarOpen}
        onClose={() => setIsAgregarOpen(false)}
        articulosExcluidos={articulosExcluidos}
        onAgregar={handleAgregarProducto}
      />
    </>
  );
}
