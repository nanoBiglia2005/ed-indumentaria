import { useMemo, useState } from 'react';
import type { ARTICULOS, RemitoCreadoConCliente } from '@backend/types';
import type { ArticuloDeVenta, ItemAConfirmar } from '@/types/ventas';
import BaseModal from '@/components/ui/BaseModal';
import { crearRemitoPrueba } from '@/api/ventaPrueba';
import { mensajeDetallesPrimero } from '@/api/cliente';
import { estiloLineClamp } from '@/utils/formato';
import AgregarProductoModal from '@/features/ventas/agregar-producto/AgregarProductoModal';
import BuscarPorCodigoModal from '@/features/ventas/modales/BuscarPorCodigoModal';
import ConfirmarProductoModal from '@/features/ventas/modales/ConfirmarProductoModal';
import ConfirmarVentaModal from '@/features/ventas/modales/ConfirmarVentaModal';
import SeccionCliente from '@/features/ventas/cliente/SeccionCliente';
import { aDatosAPI } from '@/features/ventas/cliente/formatoCliente';
import { useClienteDeVenta } from '@/features/ventas/cliente/useClienteDeVenta';

const MAX_LINEAS_DESCRIPCION = 3;

interface ProductoSeleccionado {
  articulo: ARTICULOS;
  cantidad: number | null;
}

interface NuevaVentaModalPruebaProps {
  abierto: boolean;
  onCerrar: () => void;
  /** El remito ya quedo guardado como pendiente de cobro (y se imprimio). */
  onVentaRegistrada: (remito: RemitoCreadoConCliente) => void;
}

/**
 * COPIA DE PRUEBA de NuevaVentaModal (la original sigue en uso, sin tocar).
 *
 * Lo que cambia respecto de la original:
 *  - los articulos se agregan por dos caminos: la busqueda paso a paso de
 *    siempre (AgregarProductoModal) o el lector de codigo de barras
 *    (BuscarPorCodigoModal), que desemboca en el mismo modal de confirmacion;
 *  - la cantidad de cada linea se ajusta tambien con los botones - / +;
 *  - se le puede asignar un cliente final a la venta (SeccionCliente);
 *  - antes de registrar la venta se repasa todo en ConfirmarVentaModal;
 *  - el remito se crea con POST /api/venta-prueba/remitos, que ademas guarda el
 *    cliente y las ediciones que se le hayan hecho.
 */
export default function NuevaVentaModalPrueba({
  abierto,
  onCerrar,
  onVentaRegistrada,
}: NuevaVentaModalPruebaProps) {
  const [productos, setProductos] = useState<ProductoSeleccionado[]>([]);
  const [isAgregarOpen, setIsAgregarOpen] = useState(false);
  const [isCodigoOpen, setIsCodigoOpen] = useState(false);
  // Articulo llegado por codigo de barras, esperando que se elija la cantidad.
  // Es una lista porque ConfirmarProductoModal se comparte con el alta masiva.
  const [productosAConfirmar, setProductosAConfirmar] = useState<ArticuloDeVenta[] | null>(null);
  // Con que boton se pidio confirmar la venta (null = no se pidio todavia).
  const [ventaAConfirmar, setVentaAConfirmar] = useState<'con-impresion' | 'sin-impresion' | null>(
    null
  );
  // Cual de los dos botones de confirmar esta en curso (null = ninguno).
  const [accionEnCurso, setAccionEnCurso] = useState<'con-impresion' | 'sin-impresion' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cliente = useClienteDeVenta();

  const isLoading = accionEnCurso !== null;

  const resetForm = () => {
    setProductos([]);
    setError(null);
    setVentaAConfirmar(null);
    cliente.quitar();
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

  // Encontrado por codigo: se cierra el buscador y se pasa por el MISMO modal
  // de confirmacion que el alta por busqueda, para elegir la cantidad.
  const handleArticuloEncontrado = (articulo: ArticuloDeVenta) => {
    setIsCodigoOpen(false);
    setProductosAConfirmar([articulo]);
  };

  const handleConfirmarProductos = (items: ItemAConfirmar[]) => {
    for (const { articulo, cantidad } of items) {
      handleAgregarProducto(articulo, cantidad);
    }
    setProductosAConfirmar(null);
  };

  // Solo digitos: la cantidad se sube y baja con los botones - / + o
  // escribiendo el numero, nunca con decimales ni signos.
  const handleCantidadChange = (id_articulo: number, valor: string) => {
    const digitos = valor.replace(/\D/g, '');
    const cantidad = digitos === '' ? null : Number(digitos);
    setProductos((prev) =>
      prev.map((p) => (p.articulo.id_articulo === id_articulo ? { ...p, cantidad } : p))
    );
  };

  // Botones - / +: nunca bajan de 1 (para sacar el articulo esta la X).
  const handleAjustarCantidad = (id_articulo: number, delta: number) => {
    setProductos((prev) =>
      prev.map((p) =>
        p.articulo.id_articulo === id_articulo
          ? { ...p, cantidad: Math.max(1, (p.cantidad ?? 0) + delta) }
          : p
      )
    );
  };

  const handleQuitarProducto = (id_articulo: number) => {
    setProductos((prev) => prev.filter((p) => p.articulo.id_articulo !== id_articulo));
  };

  // Primer paso de los dos botones de confirmar: valida y abre el repaso de la
  // venta. Recien ahi se registra.
  const handlePedirConfirmacion = (imprimir: boolean) => {
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

    // Los datos del cliente asignado se guardan junto con la venta: si quedaron
    // invalidos hay que arreglarlos antes, no cuando ya falla el POST.
    if (cliente.errorDeDatos) {
      setError(`Revisá los datos del cliente: ${cliente.errorDeDatos}`);
      return;
    }

    setError(null);
    setVentaAConfirmar(imprimir ? 'con-impresion' : 'sin-impresion');
  };

  const handleConfirmar = async () => {
    if (ventaAConfirmar === null) return;
    const imprimir = ventaAConfirmar === 'con-impresion';

    try {
      setAccionEnCurso(ventaAConfirmar);
      setError(null);

      // Registra el remito como pendiente de cobro (con los precios en efectivo)
      // y, si corresponde, imprime el ticket con los dos precios. El metodo de
      // pago se elige despues.
      //
      // El cliente solo viaja si se le editaron datos: el backend los pisa en la
      // misma transaccion en la que crea el remito.
      const remitoCreado = await crearRemitoPrueba({
        detalles: productos.map((p) => ({
          id_articulo: p.articulo.id_articulo,
          cantidad: p.cantidad as number,
        })),
        imprimir,
        id_cliente: cliente.asignado?.id_cliente ?? null,
        ...(cliente.asignado && cliente.hayCambios ? { cliente: aDatosAPI(cliente.borrador) } : {}),
      });

      resetForm();
      onVentaRegistrada(remitoCreado);
    } catch (err) {
      setVentaAConfirmar(null);
      setError(mensajeDetallesPrimero(err, 'No se pudo registrar la venta.'));
    } finally {
      setAccionEnCurso(null);
    }
  };

  const claseBotonCantidad =
    'w-8 h-8 shrink-0 flex items-center justify-center text-lg font-medium text-gray-500 hover:bg-violet-50 hover:text-violet-600 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <>
      <BaseModal
        abierto={abierto}
        onCerrar={handleClose}
        titulo={
          <div className='flex items-center justify-between gap-4'>
            <span>Nueva Venta</span>
            <button
              type='button'
              onClick={handleClose}
              disabled={isLoading}
              className='px-4 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-60 shrink-0'
            >
              Cerrar
            </button>
          </div>
        }
        claseTitulo='text-xl font-medium leading-6 text-gray-900 mb-4'
        ancho='2xl'
        clasePanel='select-none'
        error={error ? { titulo: 'Error al registrar la venta', detalle: error } : null}
        footer={
          <div className='flex w-full flex-col gap-3 sm:flex-row'>
            <button
              onClick={() => handlePedirConfirmacion(true)}
              disabled={isLoading}
              className='flex-1 px-3 py-2 cursor-pointer text-sm font-medium text-white bg-violet-600 rounded-md hover:bg-violet-700 disabled:bg-violet-400 transition-colors'
            >
              {accionEnCurso === 'con-impresion' ? 'Imprimiendo...' : 'Confirmar e Imprimir'}
            </button>
            <button
              onClick={() => handlePedirConfirmacion(false)}
              disabled={isLoading}
              className='flex-1 px-3 py-2 cursor-pointer text-sm font-medium text-violet-600 border border-violet-600 rounded-md hover:bg-violet-50 disabled:opacity-60 transition-colors'
            >
              {accionEnCurso === 'sin-impresion' ? 'Preparando...' : 'Confirmar Sin Imprimir'}
            </button>
          </div>
        }
      >
        <div className='flex flex-wrap items-center gap-x-5 gap-y-2 mb-2 justify-between'>
          <div className='flex flex-wrap gap-3 items-center'>
            <span className='text-lg font-medium text-gray-700'>Artículos</span>
            <button
              type='button'
              onClick={() => setIsAgregarOpen(true)}
              className='text-sm px-3 py-1.5 border border-violet-600 text-violet-600 font-medium rounded hover:bg-violet-500 hover:text-white transition-colors cursor-pointer'
            >
              Agregar por Búsqueda
            </button>
            <button
              type='button'
              onClick={() => setIsCodigoOpen(true)}
              className='text-sm px-3 py-1.5 border border-violet-600 bg-violet-600 text-white font-medium rounded hover:bg-violet-700 hover:border-violet-700 transition-colors cursor-pointer'
            >
              Agregar por Código de Barras
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
                <div className='flex items-center rounded-md border border-gray-300 overflow-hidden shrink-0'>
                  <button
                    type='button'
                    onClick={() => handleAjustarCantidad(articulo.id_articulo, -1)}
                    disabled={(cantidad ?? 0) <= 1}
                    aria-label='Quitar una unidad'
                    className={claseBotonCantidad}
                  >
                    –
                  </button>
                  {/* type='text' + inputMode='numeric' (igual que la tabla de
                      Precios): el type='number' trae sus propias flechitas de
                      subir/bajar, que aca sobran porque estan los botones
                      - / +, y ademas deja escribir "e", "-" y comas. */}
                  <input
                    type='text'
                    inputMode='numeric'
                    autoComplete='off'
                    value={cantidad === null ? '' : cantidad}
                    onChange={(e) => handleCantidadChange(articulo.id_articulo, e.target.value)}
                    aria-label={`Cantidad de ${articulo.descripcion ?? 'el artículo'}`}
                    className='w-14 py-1 text-sm border-x border-gray-300 text-center focus:outline-none focus:ring-2 focus:ring-inset focus:ring-violet-500'
                  />
                  <button
                    type='button'
                    onClick={() => handleAjustarCantidad(articulo.id_articulo, 1)}
                    aria-label='Agregar una unidad'
                    className={claseBotonCantidad}
                  >
                    +
                  </button>
                </div>
                <span className='w-20 text-right text-sm font-medium text-gray-800 shrink-0'>
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

        <SeccionCliente cliente={cliente} deshabilitado={isLoading} />
      </BaseModal>

      <AgregarProductoModal
        abierto={isAgregarOpen}
        onCerrar={() => setIsAgregarOpen(false)}
        articulosExcluidos={articulosExcluidos}
        onAgregar={handleAgregarProducto}
      />

      <BuscarPorCodigoModal
        abierto={isCodigoOpen}
        onCerrar={() => setIsCodigoOpen(false)}
        articulosExcluidos={articulosExcluidos}
        onEncontrado={handleArticuloEncontrado}
      />

      <ConfirmarProductoModal
        abierto={productosAConfirmar !== null}
        productos={productosAConfirmar}
        onCerrar={() => setProductosAConfirmar(null)}
        onConfirmar={handleConfirmarProductos}
      />

      <ConfirmarVentaModal
        abierto={ventaAConfirmar !== null}
        productos={productos}
        cliente={cliente}
        total={totalVenta}
        cargando={isLoading}
        conImpresion={ventaAConfirmar === 'con-impresion'}
        onCerrar={() => setVentaAConfirmar(null)}
        onConfirmar={handleConfirmar}
      />
    </>
  );
}
