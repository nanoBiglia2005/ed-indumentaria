import { useMemo, useState } from 'react';
import type { RemitoCreado, TIPOS_DE_PAGO } from '@backend/types';
import type { ArticuloDeVenta, ItemAConfirmar } from '@/types/ventas';
import BaseModal from '@/components/ui/BaseModal';
import { crearRemito } from '@/api/remitos';
import { mensajeDetallesPrimero } from '@/api/cliente';
import { estiloLineClamp, formatearPesos } from '@/utils/formato';
import AgregarProductoModal from '@/features/ventas/agregar-producto/AgregarProductoModal';
import BuscarPorCodigoModal from '@/features/ventas/modales/BuscarPorCodigoModal';
import ConfirmarProductoModal from '@/features/ventas/modales/ConfirmarProductoModal';
import ConfirmarVentaModal from '@/features/ventas/modales/ConfirmarVentaModal';
import SeccionCliente from '@/features/ventas/cliente/SeccionCliente';
import { aDatosAPI } from '@/features/ventas/cliente/formatoCliente';
import { useClienteDeVenta } from '@/features/ventas/cliente/useClienteDeVenta';
import { totalesDeLineas } from '@/features/ventas/pago/calculoPago';
import PaymentIcon from '@/components/ui/PaymentIcon';
import SelectorImpresora from '@/components/ui/SelectorImpresora';
import { useImpresoras } from '@/hooks/useImpresoras';

const MAX_LINEAS_DESCRIPCION = 3;

/**
 * Columnas de la lista de articulos agregados: descripcion | cantidad (el
 * control - / input / +) | subtotal | boton de quitar. La comparten el
 * encabezado y cada fila, que es lo que mantiene "Cant." y "Subtotal" sobre
 * sus valores aunque el contenido de cada fila mida distinto.
 *
 * La columna de cantidad es fija (el control mide siempre lo mismo) y la del
 * subtotal es `minmax` para que un importe largo la agrande en vez de
 * recortarse.
 */
const COLUMNAS =
  'grid grid-cols-[minmax(0,1fr)_8rem_minmax(6rem,auto)_1.25rem] items-center gap-3 px-4';

interface ProductoSeleccionado {
  articulo: ArticuloDeVenta;
  cantidad: number | null;
}

interface NuevaVentaModalProps {
  abierto: boolean;
  onCerrar: () => void;
  metodosConRecargo: TIPOS_DE_PAGO[];
  /** El remito ya quedo guardado como pendiente de cobro (y se imprimio). */
  onVentaRegistrada: (remito: RemitoCreado) => void;
}

/**
 * Alta de una venta: los articulos, el cliente y el precio.
 *
 * Los articulos se agregan por la busqueda paso a paso o con el lector de
 * codigo de barras, y los dos caminos terminan en el mismo modal de
 * confirmacion de cantidad. Cada articulo llega del backend con su
 * `precios_por_metodo`, asi que los totales de cada metodo se arman sumando
 * esos precios: en esta pantalla no se aplica ningun recargo.
 */
export default function NuevaVentaModal({
  abierto,
  onCerrar,
  metodosConRecargo,
  onVentaRegistrada,
}: NuevaVentaModalProps) {
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
  // Solo se usa para OFRECER la eleccion: quien decide el destino real es el
  // backend con el rol de la sesion.
  const impresoras = useImpresoras();

  const isLoading = accionEnCurso !== null;

  const impresoraElegida =
    impresoras.impresoras.find(
      (impresora) => impresora.id_impresora === impresoras.seleccionada
    ) ?? null;

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

  const totalVenta = useMemo(
    () => productos.reduce((acumulado, p) => acumulado + p.articulo.precio * (p.cantidad ?? 0), 0),
    [productos]
  );

  // Totales de cada metodo: suma de los precios por linea que calculo el
  // backend, con la misma regla que usa el cobro.
  const totalesPorMetodo = useMemo(
    () =>
      totalesDeLineas(
        productos.map((p) => ({
          precios_por_metodo: p.articulo.precios_por_metodo,
          cantidad: p.cantidad ?? 0,
        })),
        metodosConRecargo
      ),
    [productos, metodosConRecargo]
  );

  const articulosExcluidos = useMemo(
    () => productos.map((p) => p.articulo.id_articulo),
    [productos]
  );

  // El modal de agregar productos ya deja elegir la cantidad (via su modal de
  // confirmacion o, en masa, siempre 1), asi que se respeta la que llega.
  const handleAgregarProducto = (articulo: ArticuloDeVenta, cantidad: number) => {
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

      // Registra el remito como pendiente de cobro y, si corresponde, imprime
      // el ticket. El metodo de pago se elige despues, al cobrar.
      //
      // El cliente solo viaja si se le editaron datos: el backend los pisa en la
      // misma transaccion en la que crea el remito. Si ese dato editado ya es
      // de OTRO cliente, el backend corta con 409 y aca se muestra como
      // cualquier otro error: no se ofrece asignar/sobrescribir (esa decision
      // queda solo para el alta de un cliente nuevo, ver SeccionCliente).
      const remitoCreado = await crearRemito({
        detalles: productos.map((p) => ({
          id_articulo: p.articulo.id_articulo,
          cantidad: p.cantidad as number,
        })),
        imprimir,
        id_cliente: cliente.asignado?.id_cliente ?? null,
        // Solo lo mira el backend si este rol puede elegir impresora; si no,
        // el ticket sale por la predeterminada igual.
        id_impresora: impresoras.seleccionada,
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
    'w-8 h-8 shrink-0 flex items-center justify-center text-lg font-medium text-neutro-600 hover:bg-marca-50 hover:text-marca-600 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40';

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
              className='px-4 py-1.5 text-sm font-medium text-neutro-600 bg-neutro-100 rounded hover:bg-neutro-200 transition-colors cursor-pointer disabled:opacity-60 shrink-0'
            >
              Cerrar
            </button>
          </div>
        }
        claseTitulo='text-xl font-medium leading-6 text-neutro-900 mb-4'
        ancho='2xl'
        clasePanel='select-none'
        error={error ? { titulo: 'Error al registrar la venta', detalle: error } : null}
        footer={
          <div className='flex w-full flex-col gap-3 sm:flex-row sm:items-end'>
            <div className='sm:w-56'>
              <SelectorImpresora
                impresoras={impresoras.impresoras}
                valor={impresoras.seleccionada}
                onChange={impresoras.setSeleccionada}
                puedeElegir={impresoras.puedeElegir}
                deshabilitado={isLoading}
              />
            </div>
            <button
              onClick={() => handlePedirConfirmacion(true)}
              disabled={isLoading}
              className='flex-1 px-3 py-2 cursor-pointer text-sm font-medium text-white bg-marca-500 rounded hover:bg-marca-600 disabled:bg-marca-400 transition-colors'
            >
              {accionEnCurso === 'con-impresion' ? 'Imprimiendo...' : 'Confirmar e Imprimir'}
            </button>
            <button
              onClick={() => handlePedirConfirmacion(false)}
              disabled={isLoading}
              className='flex-1 px-3 py-2 cursor-pointer text-sm font-medium text-marca-600 border border-marca-600 rounded hover:bg-marca-50 disabled:opacity-60 transition-colors'
            >
              {accionEnCurso === 'sin-impresion' ? 'Preparando...' : 'Confirmar Sin Imprimir'}
            </button>
          </div>
        }
      >
        <div className='flex flex-wrap items-center gap-3 mb-2'>
          <span className='text-lg font-medium text-neutro-600'>Artículos</span>
          <button
            type='button'
            onClick={() => setIsAgregarOpen(true)}
            className='text-sm px-3 py-1.5 border border-marca-600 text-marca-600 font-medium rounded hover:bg-marca-500 hover:text-white transition-colors cursor-pointer'
          >
            Agregar por Búsqueda
          </button>
          <button
            type='button'
            onClick={() => setIsCodigoOpen(true)}
            className='text-sm px-3 py-1.5 border border-marca-500 bg-marca-500 text-white font-medium rounded hover:bg-marca-600 hover:border-marca-600 transition-colors cursor-pointer'
          >
            Agregar por Código de Barras
          </button>
        </div>

        <div className='border border-neutro-200 rounded max-h-72 overflow-y-auto divide-y divide-neutro-100'>
          {productos.length === 0 ? (
            <p className='text-sm text-neutro-400 italic px-4 py-3'>No hay artículos agregados</p>
          ) : (
            <>
              {/* Encabezado con LA MISMA plantilla de columnas que las filas:
                  si solo se pusiera texto con el mismo gap, cada rotulo caeria
                  donde lo dejara el ancho del contenido de la fila. Queda
                  pegado arriba (sticky) porque la lista scrollea. */}
              <div
                className={`${COLUMNAS} sticky top-0 z-10 bg-white py-2 text-[10px] font-semibold uppercase tracking-wide text-neutro-400`}
              >
                <span>Artículo / precio unitario</span>
                <span className='text-center'>Cant.</span>
                <span className='text-right'>Subtotal</span>
                <span />
              </div>
              {productos.map(({ articulo, cantidad }) => (
              <div key={articulo.id_articulo} className={`${COLUMNAS} py-2`}>
                <div className='min-w-0 flex flex-col text-left'>
                  <span
                    className='text-md text-neutro-900 break-words'
                    style={estiloLineClamp(MAX_LINEAS_DESCRIPCION)}
                  >
                    {articulo.descripcion ?? 'Sin Nombre'}
                  </span>
                  {/* Precio unitario: el base y el de cada metodo, lado a lado. */}
                  <div className='flex flex-wrap items-center gap-2'>
                    <span className='flex gap-1 items-center text-neutro-600'>
                      <PaymentIcon paymentId={1} height={18}/>
                      <span className='text-[12px] font-medium'>{formatearPesos(articulo.precio)}</span>
                    </span>      
                    {metodosConRecargo.map((metodo) => (
                      <span
                        key={metodo.id_tipos_de_pago}
                        className='flex gap-1 items-center text-marca-500'
                        title={`Precio con ${metodo.nombre_tipo_de_pago}`}
                      >
                        <PaymentIcon paymentId={metodo.id_tipos_de_pago} height={18}/>
                        <p className='text-[12px] font-medium'>{formatearPesos(articulo.precios_por_metodo?.[metodo.id_tipos_de_pago] ?? 0)}</p>
                      </span>
                    ))}
                  </div>
                </div>

                <div className='flex items-center justify-self-center rounded border border-neutro-200 overflow-hidden shrink-0'>
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
                    className='w-14 py-1 text-sm border-x border-neutro-200 text-center focus:outline-none focus:ring-2 focus:ring-inset focus:ring-marca-500'
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

                {/* Precio x cantidad: el base y el de cada metodo, uno debajo del otro. */}
                <div className='flex flex-col items-end'>
                  <span className='flex items-center gap-1 text-neutro-900'> 
                    <span className='text-sm font-medium min-w-14 text-right'>
                      {formatearPesos(articulo.precio * (cantidad ?? 0))}
                    </span>
                    <PaymentIcon paymentId={1} height={20}/>
                  </span>
                  {metodosConRecargo.map((metodo) => (
                    <span
                      key={metodo.id_tipos_de_pago}
                      className='flex items-center gap-1 text-sm font-medium text-marca-500'
                      title={`Subtotal con ${metodo.nombre_tipo_de_pago}`}
                    >
                      <span className='min-w-14 text-right'>
                      {formatearPesos((articulo.precios_por_metodo?.[metodo.id_tipos_de_pago] ?? 0) *
                        (cantidad ?? 0))}
                      </span>
                      <PaymentIcon paymentId={metodo.id_tipos_de_pago} height={20}/>
                    </span>
                  ))}
                </div>

                <button
                  type='button'
                  onClick={() => handleQuitarProducto(articulo.id_articulo)}
                  className='font-bold text-neutro-400 hover:text-red-600 cursor-pointer justify-self-center'
                >
                  X
                </button>
              </div>
              ))}
            </>
          )}
        </div>

        <SeccionCliente cliente={cliente} deshabilitado={isLoading} />

        {/* El total va abajo de todo: asi hay lugar para mostrar el de cada
            metodo de pago uno debajo del otro, sin apretar el encabezado. */}
        <div className='mt-6 flex items-start justify-between gap-4 border-t border-neutro-200 pt-4'>
          <span className='text-xl font-medium text-neutro-600'>Total</span>
          <div className='flex flex-col items-end text-2xl font-semibold '>
            <span className='flex gap-2 items-center'>
              <span className='text-right text-neutro-900'>{formatearPesos(totalVenta)}</span>
              <PaymentIcon paymentId={1} height={25}/>
            </span>
            {metodosConRecargo.map((metodo) => (
              <span
                key={metodo.id_tipos_de_pago}
                className='text-marca-600 flex gap-2 items-center'
                title={`Total con ${metodo.nombre_tipo_de_pago}`}
              >
                <span className='text-right'>
                  {formatearPesos(totalesPorMetodo[metodo.id_tipos_de_pago] ?? 0)}
                </span>
                <PaymentIcon paymentId={metodo.id_tipos_de_pago} height={25}/>
              </span>
            ))}
          </div>
        </div>
      </BaseModal>

      <AgregarProductoModal
        abierto={isAgregarOpen}
        onCerrar={() => setIsAgregarOpen(false)}
        articulosExcluidos={articulosExcluidos}
        metodos={metodosConRecargo}
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
        metodosConRecargo={metodosConRecargo}
        limitarPorStock
        onCerrar={() => setProductosAConfirmar(null)}
        onConfirmar={handleConfirmarProductos}
      />

      <ConfirmarVentaModal
        abierto={ventaAConfirmar !== null}
        productos={productos}
        cliente={cliente}
        total={totalVenta}
        totalesPorMetodo={totalesPorMetodo}
        metodos={metodosConRecargo}
        cargando={isLoading}
        conImpresion={ventaAConfirmar === 'con-impresion'}
        nombreImpresora={impresoras.puedeElegir ? impresoraElegida?.nombre ?? null : null}
        onCerrar={() => setVentaAConfirmar(null)}
        onConfirmar={handleConfirmar}
      />
    </>
  );
}
