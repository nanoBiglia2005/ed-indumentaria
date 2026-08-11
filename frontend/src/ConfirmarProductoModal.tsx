import { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import type { ArticuloDeVenta } from './AgregarProductoModal';

export type ItemAConfirmar = { articulo: ArticuloDeVenta; cantidad: number };

interface ConfirmarProductoModalProps {
  /** null = cerrado. Uno o varios productos (alta individual o masiva). */
  productos: ArticuloDeVenta[] | null;
  onClose: () => void;
  onConfirmar: (items: ItemAConfirmar[]) => void;
}

export default function ConfirmarProductoModal({
  productos,
  onClose,
  onConfirmar,
}: ConfirmarProductoModalProps) {
  // Cantidad por articulo (id_articulo -> cantidad), asi cada uno se edita
  // por separado cuando se confirman varios a la vez.
  const [cantidades, setCantidades] = useState<Record<number, number | null>>({});

  // Reset al llegar una tanda de productos distinta, ajustando el estado
  // durante el render en vez de con un efecto (evita el re-render en cascada).
  const [productosAnterior, setProductosAnterior] = useState(productos);
  if (productos !== productosAnterior) {
    setProductosAnterior(productos);
    setCantidades(Object.fromEntries((productos ?? []).map((p) => [p.id_articulo, 1])));
  }

  const items = productos ?? [];

  const cantidadDe = (id_articulo: number) => cantidades[id_articulo] ?? null;

  const handleCantidadChange = (id_articulo: number, valor: string) => {
    setCantidades((prev) => ({
      ...prev,
      [id_articulo]: valor === '' ? null : Math.trunc(Number(valor)),
    }));
  };

  const esValida = (cantidad: number | null) => cantidad !== null && Number.isInteger(cantidad) && cantidad > 0;

  const todasValidas = items.length > 0 && items.every((p) => esValida(cantidadDe(p.id_articulo)));

  const total = items.reduce((acumulado, p) => acumulado + p.precio * (cantidadDe(p.id_articulo) ?? 0), 0);

  const handleConfirmar = () => {
    if (!todasValidas) return;
    onConfirmar(items.map((p) => ({ articulo: p, cantidad: cantidadDe(p.id_articulo) as number })));
  };

  const esMultiple = items.length > 1;

  return (
    <Transition appear show={productos !== null} as={Fragment}>
      <Dialog as='div' className='relative z-[70]' onClose={onClose}>
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
              <Dialog.Panel className='w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all'>
                <Dialog.Title as='h3' className='text-lg font-medium leading-6 text-gray-900 mb-4'>
                  {esMultiple ? `Confirmar Productos (${items.length})` : 'Confirmar Producto'}
                </Dialog.Title>

                <div className='max-h-72 overflow-y-auto -mx-1 px-1 divide-y divide-gray-100'>
                  {items.map((articulo) => {
                    const cantidad = cantidadDe(articulo.id_articulo);
                    return (
                      <div key={articulo.id_articulo} className='flex items-center gap-3 py-2'>
                        <div className='flex-1 min-w-0 text-left'>
                          <p className='text-sm font-semibold text-gray-800 break-words'>
                            {articulo.descripcion ?? 'Sin Nombre'}
                          </p>
                          <p className='text-xs text-gray-500'>
                            Talle: {articulo.talle ?? 'Sin Talle'}
                            {articulo.detalle ? ` · ${articulo.detalle}` : ''}
                          </p>
                        </div>
                        <input
                          type='number'
                          min={1}
                          step={1}
                          value={cantidad === null ? '' : cantidad}
                          onChange={(e) => handleCantidadChange(articulo.id_articulo, e.target.value)}
                          className='w-16 px-2 py-1 text-sm border border-gray-300 rounded-md text-center shrink-0 focus:outline-none focus:ring-2 focus:ring-violet-500'
                        />
                        <span className='w-20 text-right text-sm font-medium text-gray-800 shrink-0'>
                          {(articulo.precio * (cantidad ?? 0)).toFixed(2)}$
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className='flex items-center justify-between pt-3 mt-1 border-t border-gray-100'>
                  <span className='text-md text-gray-500'>Precio Total</span>
                  <span className='text-xl font-semibold text-violet-600'>{total.toFixed(2)}$</span>
                </div>

                <div className='mt-6 flex gap-3'>
                  <button
                    onClick={onClose}
                    className='flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors cursor-pointer'
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmar}
                    disabled={!todasValidas}
                    className='flex-1 px-4 py-2 cursor-pointer text-sm font-medium text-white bg-violet-600 rounded-md hover:bg-violet-700 disabled:bg-violet-400 disabled:cursor-not-allowed transition-colors'
                  >
                    {esMultiple ? 'Agregar Productos' : 'Agregar Producto'}
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
