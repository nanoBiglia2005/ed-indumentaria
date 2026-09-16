import { useMemo, useState } from 'react';
import type { TIPOS_DE_PAGO } from '@backend/types';
import type { ArticuloDeVenta, ItemAConfirmar } from '@/types/ventas';
import BaseModal from '@/components/ui/BaseModal';
import { crearPresupuesto } from '@/api/presupuestos';
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

/** Misma plantilla de columnas que la lista de Nueva Venta. */
const COLUMNAS =
  'grid grid-cols-[minmax(0,1fr)_8rem_minmax(6rem,auto)_1.25rem] items-center gap-3 px-4';

interface ProductoSeleccionado {
  articulo: ArticuloDeVenta;
  cantidad: number | null;
}

interface CrearPresupuestoModalProps {
  abierto: boolean;
  onCerrar: () => void;
  metodosConRecargo: TIPOS_DE_PAGO[];
  /** El ticket ya salio por la impresora. No hay nada guardado que devolver. */
  onPresupuestoImpreso: () => void;
}

/**
 * Alta de un presupuesto: mismo wizard que una venta (articulos + cliente),
 * pero NO se persiste nada. El backend arma el ticket y lo manda a imprimir, y
 * ahi termina: no hay remito, no hay codigo y no aparece en Ventas Pendientes
 * ni en el Historial.
 *
 * Por eso tampoco limita por stock (se puede presupuestar lo que todavia no
 * esta) y el unico boton es "Confirmar e Imprimir": sin impresion, un
 * presupuesto no deja rastro de nada.
 */
export default function CrearPresupuestoModal({
  abierto,
  onCerrar,
  metodosConRecargo,
  onPresupuestoImpreso,
}: CrearPresupuestoModalProps) {
  const [productos, setProductos] = useState<ProductoSeleccionado[]>([]);
  const [isAgregarOpen, setIsAgregarOpen] = useState(false);
  const [isCodigoOpen, setIsCodigoOpen] = useState(false);
  // Articulo llegado por codigo de barras, esperando que se elija la cantidad.
  const [productosAConfirmar, setProductosAConfirmar] = useState<ArticuloDeVenta[] | null>(null);
  // Se pidió confirmar el presupuesto (hay un solo camino: imprimir).
  const [pidiendoConfirmacion, setPidiendoConfirmacion] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cliente = useClienteDeVenta();
  // Solo se usa para OFRECER la eleccion: quien decide el destino real es el
  // backend con el rol de la sesion.
  const impresoras = useImpresoras();

  const isLoading = imprimiendo;

  const impresoraElegida =
    impresoras.impresoras.find(
      (impresora) => impresora.id_impresora === impresoras.seleccionada
    ) ?? null;

  const resetForm = () => {
    setProductos([]);
    setError(null);
    setPidiendoConfirmacion(false);
    cliente.quitar();
  };

  const handleClose = () => {
    if (isLoading) return;
    resetForm();
    onCerrar();
  };

  const totalPresupuesto = useMemo(
    () => productos.reduce((acumulado, p) => acumulado + p.articulo.precio * (p.cantidad ?? 0), 0),
    [productos]
  );

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

  const handleAgregarProducto = (articulo: ArticuloDeVenta, cantidad: number) => {
    setProductos((prev) => {
      const yaEsta = prev.some((p) => p.articulo.id_articulo === articulo.id_articulo);
      if (yaEsta) return prev;
      return [...prev, { articulo, cantidad }];
    });
    setError(null);
  };

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

  // Primer paso del boton de confirmar: valida y abre el repaso. Recien ahi se
  // manda a imprimir.
  const handlePedirConfirmacion = () => {
    if (productos.length === 0) {
      setError('Agregá al menos un artículo al presupuesto.');
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

    // Si el cliente quedo con datos invalidos hay que arreglarlos antes: sus
    // datos se guardan igual (dar de alta un cliente es funcionalidad aparte).
    if (cliente.errorDeDatos) {
      setError(`Revisá los datos del cliente: ${cliente.errorDeDatos}`);
      return;
    }

    setError(null);
    setPidiendoConfirmacion(true);
  };

  const handleConfirmar = async () => {
    try {
      setImprimiendo(true);
      setError(null);

      const presupuesto = await crearPresupuesto({
        detalles: productos.map((p) => ({
          id_articulo: p.articulo.id_articulo,
          cantidad: p.cantidad as number,
        })),
        id_cliente: cliente.asignado?.id_cliente ?? null,
        // Solo lo mira el backend si este rol puede elegir impresora; si no,
        // el ticket sale por la predeterminada igual.
        id_impresora: impresoras.seleccionada,
        ...(cliente.asignado && cliente.hayCambios ? { cliente: aDatosAPI(cliente.borrador) } : {}),
      });

      // Imprimir ES la accion: si el ticket no salio, no hay nada hecho.
      if (presupuesto.impresion.status === 'error') {
        setPidiendoConfirmacion(false);
        setError(presupuesto.impresion.message ?? 'No se pudo imprimir el presupuesto.');
        return;
      }

      resetForm();
      onPresupuestoImpreso();
    } catch (err) {
      setPidiendoConfirmacion(false);
      setError(mensajeDetallesPrimero(err, 'No se pudo imprimir el presupuesto.'));
    } finally {
      setImprimiendo(false);
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
            <span>Nuevo Presupuesto</span>
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
        error={error ? { titulo: 'Error al crear el presupuesto', detalle: error } : null}
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
              onClick={handlePedirConfirmacion}
              disabled={isLoading}
              className='flex-1 px-3 py-2 cursor-pointer text-sm font-medium text-white bg-marca-500 rounded hover:bg-marca-600 disabled:bg-marca-400 transition-colors'
            >
              {imprimiendo ? 'Imprimiendo...' : 'Confirmar e Imprimir'}
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
              {/* Encabezado con LA MISMA plantilla de columnas que las filas, y
                  pegado arriba porque la lista scrollea. */}
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
                        <PaymentIcon paymentId={1} height={18} />
                        <span className='text-[12px] font-medium'>
                          {formatearPesos(articulo.precio)}
                        </span>
                      </span>
                      {metodosConRecargo.map((metodo) => (
                        <span
                          key={metodo.id_tipos_de_pago}
                          className='flex gap-1 items-center text-marca-500'
                          title={`Precio con ${metodo.nombre_tipo_de_pago}`}
                        >
                          <PaymentIcon paymentId={metodo.id_tipos_de_pago} height={18} />
                          <p className='text-[12px] font-medium'>
                            {formatearPesos(
                              articulo.precios_por_metodo?.[metodo.id_tipos_de_pago] ?? 0
                            )}
                          </p>
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
                    {/* type='text' + inputMode='numeric': el type='number' trae
                        flechitas que aca sobran y deja escribir "e" y comas. */}
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
                      <PaymentIcon paymentId={1} height={20} />
                    </span>
                    {metodosConRecargo.map((metodo) => (
                      <span
                        key={metodo.id_tipos_de_pago}
                        className='flex items-center gap-1 text-sm font-medium text-marca-500'
                        title={`Subtotal con ${metodo.nombre_tipo_de_pago}`}
                      >
                        <span className='min-w-14 text-right'>
                          {formatearPesos(
                            (articulo.precios_por_metodo?.[metodo.id_tipos_de_pago] ?? 0) *
                              (cantidad ?? 0)
                          )}
                        </span>
                        <PaymentIcon paymentId={metodo.id_tipos_de_pago} height={20} />
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
              <span className='text-right text-neutro-900'>
                {formatearPesos(totalPresupuesto)}
              </span>
              <PaymentIcon paymentId={1} height={25} />
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
                <PaymentIcon paymentId={metodo.id_tipos_de_pago} height={25} />
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
        limitarPorStock={false}
        onAgregar={handleAgregarProducto}
      />

      <BuscarPorCodigoModal
        abierto={isCodigoOpen}
        onCerrar={() => setIsCodigoOpen(false)}
        articulosExcluidos={articulosExcluidos}
        limitarPorStock={false}
        onEncontrado={handleArticuloEncontrado}
      />

      {/* Sin limitarPorStock: un presupuesto puede cotizar lo que no hay. */}
      <ConfirmarProductoModal
        abierto={productosAConfirmar !== null}
        productos={productosAConfirmar}
        metodosConRecargo={metodosConRecargo}
        onCerrar={() => setProductosAConfirmar(null)}
        onConfirmar={handleConfirmarProductos}
      />

      <ConfirmarVentaModal
        abierto={pidiendoConfirmacion}
        productos={productos}
        cliente={cliente}
        total={totalPresupuesto}
        totalesPorMetodo={totalesPorMetodo}
        metodos={metodosConRecargo}
        cargando={isLoading}
        conImpresion
        titulo='¿Desea confirmar este Presupuesto?'
        nombreImpresora={impresoras.puedeElegir ? impresoraElegida?.nombre ?? null : null}
        onCerrar={() => setPidiendoConfirmacion(false)}
        onConfirmar={handleConfirmar}
      />
    </>
  );
}
