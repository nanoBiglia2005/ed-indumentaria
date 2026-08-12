import { useMemo, useState } from 'react';
import type { ARTICULOS, RemitoCreado } from '@backend/types';
import BaseModal from '@/components/ui/BaseModal';
import { crearRemito } from '@/api/remitos';
import { mensajeDetallesPrimero } from '@/api/cliente';
import { estiloLineClamp } from '@/utils/formato';
import AgregarProductoModal from '@/features/ventas/agregar-producto/AgregarProductoModal';

const MAX_LINEAS_DESCRIPCION = 3;

interface ProductoSeleccionado {
  articulo: ARTICULOS;
  cantidad: number | null;
}

interface NuevaVentaModalProps {
  abierto: boolean;
  onCerrar: () => void;
  /** El remito ya quedo guardado como pendiente de cobro (y se imprimio). */
  onVentaRegistrada: (remito: RemitoCreado) => void;
}

export default function NuevaVentaModal({ abierto, onCerrar, onVentaRegistrada }: NuevaVentaModalProps) {
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
    onCerrar();
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

  // El modal de agregar productos ya deja elegir la cantidad (via su modal de
  // confirmacion o, en masa, siempre 1), asi que se respeta la que llega.
  const handleAgregarProducto = (articulo: ARTICULOS, cantidad: number) => {
    setProductos((prev) => {
      const yaEsta = prev.some((p) => p.articulo.id_articulo === articulo.id_articulo);
      if (yaEsta) return prev;
      return [...prev, { articulo, cantidad }];
    });
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

      // Registra el remito como pendiente de cobro (con los precios en efectivo)
      // y, si corresponde, imprime el ticket con los dos precios. El metodo de
      // pago se elige despues.
      const remitoCreado = await crearRemito(
        productos.map((p) => ({
          id_articulo: p.articulo.id_articulo,
          cantidad: p.cantidad as number,
        })),
        imprimir
      );

      resetForm();
      onVentaRegistrada(remitoCreado);
    } catch (err) {
      setError(mensajeDetallesPrimero(err, 'No se pudo registrar la venta.'));
    } finally {
      setAccionEnCurso(null);
    }
  };

  return (
    <>
      <BaseModal
        abierto={abierto}
        onCerrar={handleClose}
        titulo='Nueva Venta'
        claseTitulo='text-xl font-medium leading-6 text-gray-900 mb-4'
        ancho='lg'
        clasePanel='select-none'
        error={error ? { titulo: 'Error al registrar la venta', detalle: error } : null}
      >
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
                    style={estiloLineClamp(MAX_LINEAS_DESCRIPCION)}
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
      </BaseModal>

      <AgregarProductoModal
        abierto={isAgregarOpen}
        onCerrar={() => setIsAgregarOpen(false)}
        articulosExcluidos={articulosExcluidos}
        onAgregar={handleAgregarProducto}
      />
    </>
  );
}
