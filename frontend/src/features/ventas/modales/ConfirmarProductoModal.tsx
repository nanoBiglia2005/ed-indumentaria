import { useState } from 'react';
import type { TIPOS_DE_PAGO } from '@backend/types';
import type { ArticuloDeVenta, ItemAConfirmar } from '@/types/ventas';
import BaseModal from '@/components/ui/BaseModal';
import { useResetAlCambiar } from '@/hooks/useResetAlCambiar';
import { totalesDeLineas } from '@/features/ventas/pago/calculoPago';
import PaymentIcon from "@/components/ui/PaymentIcon";

interface ConfirmarProductoModalProps {
  abierto: boolean;
  /** Uno o varios productos (alta individual o masiva). */
  productos: ArticuloDeVenta[] | null;
  /** Metodos de pago, para mostrar el precio de cada uno. */
  metodos?: TIPOS_DE_PAGO[];
  onCerrar: () => void;
  onConfirmar: (items: ItemAConfirmar[]) => void;
}

export default function ConfirmarProductoModal({
  abierto,
  productos,
  metodos = [],
  onCerrar,
  onConfirmar,
}: ConfirmarProductoModalProps) {
  // Cantidad por articulo (id_articulo -> cantidad), asi cada uno se edita
  // por separado cuando se confirman varios a la vez.
  const [cantidades, setCantidades] = useState<Record<number, number | null>>({});

  // Reset al llegar una tanda de productos distinta.
  useResetAlCambiar(productos, () =>
    setCantidades(Object.fromEntries((productos ?? []).map((p) => [p.id_articulo, 1])))
  );

  const items = productos ?? [];

  const cantidadDe = (id_articulo: number) => cantidades[id_articulo] ?? null;

  const handleCantidadChange = (id_articulo: number, valor: string) => {
    setCantidades((prev) => ({
      ...prev,
      [id_articulo]: valor === '' ? null : Math.trunc(Number(valor)),
    }));
  };

  const esValida = (cantidad: number | null) =>
    cantidad !== null && Number.isInteger(cantidad) && cantidad > 0;

  const todasValidas = items.length > 0 && items.every((p) => esValida(cantidadDe(p.id_articulo)));

  const total = items.reduce(
    (acumulado, p) => acumulado + p.precio * (cantidadDe(p.id_articulo) ?? 0),
    0
  );

  // El metodo sin recargo cobra el precio base, que ya se muestra aparte.
  const metodosConRecargo = metodos.filter((metodo) => metodo.recargo > 0);

  // Totales con cada metodo: se suman los precios por linea que ya calculo el
  // backend, con la misma regla que usa el resto del sistema.
  const totalesPorMetodo = totalesDeLineas(
    items.map((articulo) => ({
      precios_por_metodo: articulo.precios_por_metodo,
      cantidad: cantidadDe(articulo.id_articulo) ?? 0,
    })),
    metodosConRecargo
  );

  const handleConfirmar = () => {
    if (!todasValidas) return;
    onConfirmar(items.map((p) => ({ articulo: p, cantidad: cantidadDe(p.id_articulo) as number })));
  };

  const esMultiple = items.length > 1;

  return (
    <BaseModal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={esMultiple ? `Confirmar Productos (${items.length})` : 'Confirmar Producto'}
      ancho='md'
      z='z-[70]'
      footer={
        <>
          <button
            onClick={onCerrar}
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
        </>
      }
    >
      <div className='max-h-72 overflow-y-auto -mx-1 px-1 divide-y divide-gray-100'>
        {items.map((articulo) => {
          const cantidad = cantidadDe(articulo.id_articulo);
          return (
            <div key={articulo.id_articulo} className='flex items-center gap-3 py-4'>
              <div className='flex-1 min-w-0 text-left'>
                <p className='text-sm font-semibold text-gray-800 break-words'>
                  {articulo.descripcion ?? 'Sin Nombre'}
                </p>
                {/* Precio registrado y, debajo, lo que sale con cada metodo. */}
                <div className='flex gap-2 items-center'>
                  <span className='flex gap-1 items-center' title='Precio del Articulo con Efectivo'>
                    <PaymentIcon paymentId={1} height={20}/>
                    <p className='text-sm font-medium text-gray-600'>{articulo.precio}$</p>
                  </span>             
                  {metodosConRecargo.map((metodo) => (
                    <span key={metodo.id_tipos_de_pago} className='flex gap-1 items-center text-violet-600'
                    title={`Precio del Articulo con ${metodo.nombre_tipo_de_pago}`}>
                        <PaymentIcon paymentId={metodo.id_tipos_de_pago} height={20}/>
                        <p className='text-sm font-medium'>     
                          {articulo.precios_por_metodo?.[metodo.id_tipos_de_pago] ?? 0}$
                        </p>
                    </span>
                  ))}
                </div>
              </div>
              <input
                type='number'
                min={1}
                step={1}
                value={cantidad === null ? '' : cantidad}
                onChange={(e) => handleCantidadChange(articulo.id_articulo, e.target.value)}
                className='w-16 px-2 py-1 text-sm border border-gray-300 rounded-md text-center shrink-0 focus:outline-none focus:ring-2 focus:ring-violet-500'
              />
              <span className='w-25 text-sm font-medium text-gray-800 shrink-0'>
                <span className='flex gap-1 items-center justify-end' title='Total del Articulo con Efectivo'>
                  <PaymentIcon paymentId={1} height={20}/>
                  <span className='min-w-14 text-right'>{(articulo.precio * (cantidad ?? 0))}$</span>
                </span>
                {metodosConRecargo.map((metodo) => (
                    <span key={metodo.id_tipos_de_pago} className='flex gap-1 items-center justify-end text-violet-600'
                    title={`Total del Articulo con ${metodo.nombre_tipo_de_pago}`}>
                        <PaymentIcon paymentId={metodo.id_tipos_de_pago} height={20}/>
                        <span className='min-w-14 text-right'>     
                          {(articulo.precios_por_metodo?.[metodo.id_tipos_de_pago] * (cantidad ?? 0)).toFixed(0) ?? 0}$
                        </span>
                    </span>
                  ))}
              </span>
            </div>
          );
        })}
      </div>

      <div className='flex items-center justify-between pt-3 mt-1 border-t border-gray-100'>
        <span className='text-md text-gray-500'>Precio Total</span>
        <div className='flex flex-col items-end'>
          <span className='flex gap-1 items-center' title='Total con Efectivo'>
            <PaymentIcon paymentId={1} height={25}/>
            <span className='min-w-18 text-right text-lg font-semibold text-gray-800'>{total}$</span>
          </span>
          
          {metodosConRecargo.map((metodo) => (
            <span key={metodo.id_tipos_de_pago} className='flex gap-1 items-center text-violet-600' title={`Total con ${metodo.nombre_tipo_de_pago}`}> 
              <PaymentIcon paymentId={metodo.id_tipos_de_pago} height={25}/>
              <span className='min-w-18 text-right text-lg font-semibold'>
                {totalesPorMetodo[metodo.id_tipos_de_pago] ?? 0}$
              </span>
            </span>
          ))}
        </div>
      </div>
    </BaseModal>
  );
}
