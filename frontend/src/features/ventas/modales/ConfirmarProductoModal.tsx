import { useState } from 'react';
import type { TIPOS_DE_PAGO } from '@backend/types';
import type { ArticuloDeVenta, ItemAConfirmar } from '@/types/ventas';
import BaseModal from '@/components/ui/BaseModal';
import { mensajeDetallesPrimero } from '@/api/cliente';
import { verificarStockVenta } from '@/api/venta';
import { useResetAlCambiar } from '@/hooks/useResetAlCambiar';
import { totalesDeLineas } from '@/features/ventas/pago/calculoPago';
import PaymentIcon from "@/components/ui/PaymentIcon";
import { formatearPesos } from '@/utils/formato';

/**
 * Columnas de la lista: articulo | cantidad (input) | subtotal. Compartida
 * entre el encabezado y cada fila para que los rotulos queden alineados.
 */
const COLUMNAS = 'grid grid-cols-[minmax(0,1fr)_4.5rem_minmax(6rem,auto)] items-center gap-3';

interface ConfirmarProductoModalProps {
  abierto: boolean;
  /** Uno o varios productos (alta individual o masiva). */
  productos: ArticuloDeVenta[] | null;
  /** Metodos de pago, para mostrar el precio de cada uno. */
  metodosConRecargo?: TIPOS_DE_PAGO[];
  /**
   * true (venta): antes de confirmar se relee el stock en la base y se rechaza
   * la cantidad que lo supere. false (presupuesto, default): no limita.
   *
   * El default es "no limitar" porque este modal lo comparten los dos flujos y
   * es el mas seguro: el camino de venta lo pasa en true explicito.
   */
  limitarPorStock?: boolean;
  onCerrar: () => void;
  onConfirmar: (items: ItemAConfirmar[]) => void;
}

export default function ConfirmarProductoModal({
  abierto,
  productos,
  metodosConRecargo = [],
  limitarPorStock = false,
  onCerrar,
  onConfirmar,
}: ConfirmarProductoModalProps) {
  // Cantidad por articulo (id_articulo -> cantidad), asi cada uno se edita
  // por separado cuando se confirman varios a la vez.
  const [cantidades, setCantidades] = useState<Record<number, number | null>>({});
  // Verificacion de stock en curso / su resultado.
  const [verificando, setVerificando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset al llegar una tanda de productos distinta.
  useResetAlCambiar(productos, () => {
    setCantidades(Object.fromEntries((productos ?? []).map((p) => [p.id_articulo, 1])));
    setError(null);
    setVerificando(false);
  });

  const items = productos ?? [];

  const cantidadDe = (id_articulo: number) => cantidades[id_articulo] ?? null;

  // El tope es el stock del articulo, y solo en una venta: en un presupuesto
  // (limitarPorStock=false) se puede cotizar lo que no hay.
  const handleCantidadChange = (id_articulo: number, valor: string) => {
    const articulo = items.find((p) => p.id_articulo === id_articulo);
    const maximo = limitarPorStock && articulo ? articulo.cant : null;

    setCantidades((prev) => {
      let cantidad = valor === '' ? null : Math.trunc(Number(valor));
      if (cantidad !== null && maximo !== null && cantidad > maximo) cantidad = maximo;
      return { ...prev, [id_articulo]: cantidad };
    });
  };

  const esValida = (cantidad: number | null) =>
    cantidad !== null && Number.isInteger(cantidad) && cantidad > 0;

  const todasValidas = items.length > 0 && items.every((p) => esValida(cantidadDe(p.id_articulo)));

  const total = items.reduce(
    (acumulado, p) => acumulado + p.precio * (cantidadDe(p.id_articulo) ?? 0),
    0
  );

  // Totales con cada metodo: se suman los precios por linea que ya calculo el
  // backend, con la misma regla que usa el resto del sistema.
  const totalesPorMetodo = totalesDeLineas(
    items.map((articulo) => ({
      precios_por_metodo: articulo.precios_por_metodo,
      cantidad: cantidadDe(articulo.id_articulo) ?? 0,
    })),
    metodosConRecargo
  );

  const aConfirmar = () =>
    items.map((p) => ({ articulo: p, cantidad: cantidadDe(p.id_articulo) as number }));

  const handleConfirmar = async () => {
    if (!todasValidas || verificando) return;

    if (!limitarPorStock) {
      onConfirmar(aConfirmar());
      return;
    }

    // El stock de la tabla puede haber quedado viejo mientras el usuario
    // navegaba el wizard: se relee en el momento. Es comodidad, no la garantia:
    // el backend vuelve a validarlo al crear el remito.
    try {
      setVerificando(true);
      setError(null);

      const stock = await verificarStockVenta(items.map((p) => p.id_articulo));

      const excedido = items.find((p) => (cantidadDe(p.id_articulo) ?? 0) > (stock[p.id_articulo] ?? 0));
      if (excedido) {
        const disponible = stock[excedido.id_articulo] ?? 0;
        setError(
          `"${excedido.descripcion ?? 'El artículo'}" tiene ${disponible} ${
            disponible === 1 ? 'unidad disponible' : 'unidades disponibles'
          }.`
        );
        return;
      }

      onConfirmar(aConfirmar());
    } catch (err) {
      setError(mensajeDetallesPrimero(err, 'No se pudo verificar el stock disponible.'));
    } finally {
      setVerificando(false);
    }
  };

  const esMultiple = items.length > 1;

  return (
    <BaseModal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={esMultiple ? `Confirmar Productos (${items.length})` : 'Confirmar Producto'}
      ancho='md'
      z='z-[70]'
      error={error ? { titulo: 'No se pudo agregar', detalle: error } : null}
      footer={
        <>
          <button
            onClick={onCerrar}
            disabled={verificando}
            className='flex-1 px-4 py-2 text-sm font-medium text-neutro-600 bg-neutro-100 rounded hover:bg-neutro-200 transition-colors cursor-pointer disabled:opacity-60'
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={!todasValidas || verificando}
            className='flex-1 px-4 py-2 cursor-pointer text-sm font-medium text-white bg-marca-500 rounded hover:bg-marca-600 disabled:bg-marca-400 disabled:cursor-not-allowed transition-colors'
          >
            {verificando
              ? 'Verificando stock...'
              : esMultiple
                ? 'Agregar Productos'
                : 'Agregar Producto'}
          </button>
        </>
      }
    >
      <div className='max-h-72 overflow-y-auto -mx-1 px-1 divide-y divide-neutro-100'>
        {items.length > 0 && (
          /* Mismo encabezado que el detalle de un remito, con LA MISMA
             plantilla de columnas que las filas: asi cada rotulo cae sobre su
             valor aunque el ancho del contenido cambie de fila en fila. */
          <div
            className={`${COLUMNAS} sticky top-0 z-10 bg-white pb-1 text-[10px] font-semibold uppercase tracking-wide text-neutro-400`}
          >
            <span>Artículo / precio unitario</span>
            <span className='text-center'>Cant.</span>
            <span className='text-right'>Subtotal</span>
          </div>
        )}
        {items.map((articulo) => {
          const cantidad = cantidadDe(articulo.id_articulo);
          return (
            <div key={articulo.id_articulo} className={`${COLUMNAS} py-4`}>
              <div className='min-w-0 text-left'>
                <p className='text-sm font-semibold text-neutro-900 break-words'>
                  {articulo.descripcion ?? 'Sin Nombre'}
                  {limitarPorStock && (
                    <span className='ml-2 text-xs font-normal text-neutro-400'>
                      {Math.max(articulo.cant - (cantidad ?? 0), 0)} restantes
                    </span>
                  )}
                </p>
                {/* Precio registrado y, debajo, lo que sale con cada metodo. */}
                <div className='flex gap-2 items-center'>
                  <span className='flex gap-1 items-center' title='Precio del Articulo con Efectivo'>
                    <PaymentIcon paymentId={1} height={20}/>
                    <p className='text-sm font-medium text-neutro-600'>{articulo.precio}$</p>
                  </span>             
                  {metodosConRecargo.map((metodo) => (
                    <span key={metodo.id_tipos_de_pago} className='flex gap-1 items-center text-marca-600'
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
                max={limitarPorStock ? articulo.cant : undefined}
                step={1}
                value={cantidad === null ? '' : cantidad}
                onChange={(e) => handleCantidadChange(articulo.id_articulo, e.target.value)}
                className='w-16 justify-self-center px-2 py-1 text-sm border border-neutro-200 rounded text-center focus:outline-none focus:ring-2 focus:ring-marca-500'
              />
              <span className='text-sm font-medium text-neutro-900'>
                <span className='flex gap-1 items-center justify-end' title='Total del Articulo con Efectivo'>
                  <span className='min-w-14 text-right'>{formatearPesos((articulo.precio * (cantidad ?? 0)))}</span>
                  <PaymentIcon paymentId={1} height={20}/>
                </span>
                {metodosConRecargo.map((metodo) => (
                    <span key={metodo.id_tipos_de_pago} className='flex gap-1 items-center justify-end text-marca-600'
                    title={`Total del Articulo con ${metodo.nombre_tipo_de_pago}`}>
                        <span className='min-w-14 text-right'>     
                          {formatearPesos(articulo.precios_por_metodo?.[metodo.id_tipos_de_pago] * (cantidad ?? 0))}
                        </span>
                        <PaymentIcon paymentId={metodo.id_tipos_de_pago} height={20}/>
                    </span>
                  ))}
              </span>
            </div>
          );
        })}
      </div>

      <div className='flex items-center justify-between pt-3 mt-1 border-t border-neutro-100'>
        <span className='text-md text-neutro-600'>Precio Total</span>
        <div className='flex flex-col items-end'>
          <span className='flex gap-1 items-center' title='Total con Efectivo'>  
            <span className='text-right text-lg font-semibold text-neutro-900'>{formatearPesos(total)}</span>
            <PaymentIcon paymentId={1} height={25}/>
          </span>
          
          {metodosConRecargo.map((metodo) => (
            <span key={metodo.id_tipos_de_pago} className='flex gap-1 items-center text-marca-600' title={`Total con ${metodo.nombre_tipo_de_pago}`}> 
              <span className='text-right text-lg font-semibold'>
                {formatearPesos(totalesPorMetodo[metodo.id_tipos_de_pago] ?? 0)}
              </span>
              <PaymentIcon paymentId={metodo.id_tipos_de_pago} height={25}/>
            </span>
          ))}
        </div>
      </div>
    </BaseModal>
  );
}
