import { useState, useEffect, useMemo } from 'react';
import type {
  GRUPOS_DE_VENTA,
  SUBGRUPOS_DE_VENTA,
  LINEAS,
  CLIENTES_MAYORISTAS,
  TIPOS_DE_PAGO,
} from '@backend/types';
import { ID_GRUPO_NO_ASIGNADO } from '@backend/types';
import BaseModal from '@/components/ui/BaseModal';
import SegmentedToggle from '@/components/ui/SegmentedToggle';
import ListaChips from '@/components/ui/ListaChips';
import SelectListModal from '@/components/ui/SelectListModal';
import InlineFilterDropdown from '@/components/ui/InlineFilterDropdown';
import PreciosPorMetodo from '@/components/ui/PreciosPorMetodo';
import { useAccionAsync } from '@/hooks/useAccionAsync';
import { crearArticulo, asignarCliente } from '@/api/articulos';
import { mensajeDetallesPrimero } from '@/api/cliente';
import { formatearPesos } from '@/utils/formato';
import { BARCODE_AUTOMATICO, BARCODE_MAX } from '@/utils/barcode';

interface CreateArticleModalProps {
  abierto: boolean;
  onCerrar: () => void;
  onExito: () => void;
  grupos: GRUPOS_DE_VENTA[];
  subgrupos: SUBGRUPOS_DE_VENTA[];
  lineas: LINEAS[];
  clientes: CLIENTES_MAYORISTAS[];
  metodosDePago: TIPOS_DE_PAGO[];
}

interface ArticuloCreado {
  barcode_tail: string | null;
  cant: number | null;
  precio: number | null;
  talle: string | null;
  id_articulo: number;
}

const OPCIONES_BARCODE = [
  { valor: 'manual', etiqueta: 'Manual' },
  { valor: 'auto', etiqueta: 'Automático' },
] as const;

const MAX_CLIENTES_VISIBLES = 1;

const ERROR_GRUPO_OBLIGATORIO = 'La asignación a un grupo es obligatoria.';

export default function CreateArticleModal({
  abierto,
  onCerrar,
  onExito,
  grupos,
  subgrupos,
  lineas,
  clientes,
  metodosDePago,
}: CreateArticleModalProps) {
  const [pagina, setPagina] = useState<1 | 2>(1);
  // Direccion de la animacion al cambiar de paso.
  const [haciaAdelante, setHaciaAdelante] = useState(true);

  const [cantidad, setCantidad] = useState<number | null>(0);
  const [cantidadMinima, setCantidadMinima] = useState<number | null>(0);
  const [cantidadReservada, setCantidadReservada] = useState<number | null>(0);
  const [precio, setPrecio] = useState<number | null>(0);
  const [barcode, setBarcode] = useState<string>('');
  const [barcodeAuto, setBarcodeAuto] = useState<boolean>(false);
  const [talle, setTalle] = useState<string>('');
  // "Detalle" en la UI = columna `descripcion`; "Color/Modelo" en la UI =
  // columna `detalle`. Los nombres de variable siguen a la UI para no confundir.
  const [descripcion, setDescripcion] = useState<string>('');
  const [colorModelo, setColorModelo] = useState<string>('');

  const { cargando, error, setError, ejecutar } = useAccionAsync({
    mensajeDe: (err) => mensajeDetallesPrimero(err),
  });
  const [articuloCreado, setArticuloCreado] = useState<ArticuloCreado | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const [lineaSeleccionada, setLineaSeleccionada] = useState<number | null>(null);
  // Un articulo pertenece a UN grupo. Si no se elige ninguno, queda en
  // "No Asignado" por el default de la base (ese grupo no se ofrece acá).
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<number | null>(null);
  const [subgrupoSeleccionado, setSubgrupoSeleccionado] = useState<number | null>(null);
  const [clientesSeleccionados, setClientesSeleccionados] = useState<CLIENTES_MAYORISTAS[]>([]);
  const [isClienteAssignOpen, setIsClienteAssignOpen] = useState(false);

  const opcionesLinea = useMemo(
    () => lineas.map((l) => ({ id: l.id_linea, nombre: l.nombre_linea })),
    [lineas]
  );

  const opcionesGrupo = useMemo(
    () =>
      grupos
        .filter((g) => g.id_grupo !== ID_GRUPO_NO_ASIGNADO)
        .map((g) => ({ id: g.id_grupo, nombre: g.nombre_grupo ?? `Grupo ${g.id_grupo}` })),
    [grupos]
  );

  // El subgrupo solo tiene sentido dentro del grupo elegido.
  const opcionesSubgrupo = useMemo(() => {
    if (grupoSeleccionado === null) return [];
    return subgrupos
      .filter((s) => s.id_grupo === grupoSeleccionado)
      .map((s) => ({ id: s.id_subgrupo, nombre: s.nombre_subgrupo }));
  }, [subgrupos, grupoSeleccionado]);

  // Si se cambia de grupo, el subgrupo elegido (si era de otro grupo) deja de valer.
  useEffect(() => {
    if (
      subgrupoSeleccionado !== null &&
      !opcionesSubgrupo.some((o) => o.id === subgrupoSeleccionado)
    ) {
      setSubgrupoSeleccionado(null);
    }
  }, [opcionesSubgrupo, subgrupoSeleccionado]);

  // El selector de subgrupo recien aparece con un grupo elegido que tenga alguno.
  const mostrarSubgrupo = grupoSeleccionado !== null && opcionesSubgrupo.length > 0;

  // `overflow-hidden` recorta el panel del desplegable, asi que solo se aplica
  // mientras corre la animacion de entrada/salida.
  const [animandoSubgrupo, setAnimandoSubgrupo] = useState(false);
  const [mostrarSubgrupoPrevio, setMostrarSubgrupoPrevio] = useState(mostrarSubgrupo);
  if (mostrarSubgrupoPrevio !== mostrarSubgrupo) {
    setMostrarSubgrupoPrevio(mostrarSubgrupo);
    setAnimandoSubgrupo(true);
  }

  const nombreLineaSeleccionada = opcionesLinea.find((o) => o.id === lineaSeleccionada)?.nombre ?? 'Sin línea';
  const nombreGrupoSeleccionado =
    opcionesGrupo.find((o) => o.id === grupoSeleccionado)?.nombre ?? 'No Asignado';
  const nombreSubgrupoSeleccionado =
    opcionesSubgrupo.find((o) => o.id === subgrupoSeleccionado)?.nombre ?? 'Sin subgrupo';

  const resetForm = () => {
    setPagina(1);
    setCantidad(0);
    setCantidadMinima(0);
    setCantidadReservada(0);
    setPrecio(0);
    setBarcode('');
    setBarcodeAuto(false);
    setTalle('');
    setDescripcion('');
    setColorModelo('');
    setError(null);
    setLineaSeleccionada(null);
    setGrupoSeleccionado(null);
    setSubgrupoSeleccionado(null);
    setClientesSeleccionados([]);
  };

  useEffect(() => {
    if (!abierto) {
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  const handleCantidadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setCantidad(valor === '' ? null : parseInt(valor, 10));
  };

  const handleCantidadReservadaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setCantidadReservada(valor === '' ? null : parseInt(valor, 10));
  };

  const handleCantidadMinimaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setCantidadMinima(valor === '' ? null : parseInt(valor, 10));
  };

  const handlePrecioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setPrecio(valor === '' ? null : parseInt(valor, 10));
  };

  const handleBarcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!barcodeAuto) {
      const soloNumeros = e.target.value.replace(/[^0-9]/g, '').slice(0, BARCODE_MAX);
      setBarcode(soloNumeros);
    }
  };

  const handleCreateArticle = () => {
    if (grupoSeleccionado === null) {
      setShowConfirmDialog(false);
      setError(ERROR_GRUPO_OBLIGATORIO);
      return;
    }

    ejecutar(async () => {
      const payload = {
        cant: cantidad || 0,
        precio: precio || 0,
        ...(barcodeAuto ? BARCODE_AUTOMATICO : { barcode_tail: barcode.trim() === '' ? null : barcode }),
        talle: talle.trim() === '' ? null : talle.trim(),
        descripcion: descripcion.trim() === '' ? null : descripcion.trim(),
        detalle: colorModelo.trim() === '' ? null : colorModelo.trim(),
        stock_minimo: cantidadMinima || 0,
        cant_reservada: cantidadReservada || 0,
        vigente: true,
        id_grupo: grupoSeleccionado,
        ...(lineaSeleccionada !== null ? { id_linea: lineaSeleccionada } : {}),
        ...(subgrupoSeleccionado !== null ? { id_subgrupo: subgrupoSeleccionado } : {}),
      };

      const nuevoArticulo = await crearArticulo(payload);
      const id_articulo = nuevoArticulo.id_articulo;

      // Igual que siempre: las asignaciones que fallen se ignoran en silencio,
      // el articulo ya quedo creado.
      await Promise.all(
        clientesSeleccionados.map((cliente) =>
          asignarCliente(id_articulo, cliente.id_cliente).catch(() => null)
        )
      );

      setArticuloCreado({
        id_articulo: nuevoArticulo.id_articulo,
        barcode_tail: nuevoArticulo.barcode_tail,
        cant: nuevoArticulo.cant,
        precio: nuevoArticulo.precio,
        talle: nuevoArticulo.talle,
      });
      setShowConfirmDialog(false);
      setShowSuccessDialog(true);
    });
  };

  const handleCerrarExito = () => {
    setShowSuccessDialog(false);
    resetForm();
    onExito();
    onCerrar();
  };

  const irASiguiente = () => {
    setHaciaAdelante(true);
    setPagina(2);
  };

  const volverAPrimeraPagina = () => {
    // El aviso del grupo es del paso 2; los errores del backend se dejan, que
    // suelen ser de campos que se corrigen justamente en el paso 1.
    if (error === ERROR_GRUPO_OBLIGATORIO) setError(null);
    setHaciaAdelante(false);
    setPagina(1);
  };

  const abrirConfirmacion = () => {
    if (grupoSeleccionado === null) {
      setError(ERROR_GRUPO_OBLIGATORIO);
      return;
    }
    setError(null);
    setShowConfirmDialog(true);
  };

  return (
    <>
      <BaseModal
        abierto={abierto}
        onCerrar={onCerrar}
        titulo={`Crear Nuevo Artículo · Paso ${pagina} de 2`}
        ancho={pagina === 1 ? '2xl' : 'xl'}
        permitirDesborde
        // El error de la creacion se muestra dentro del dialogo de confirmacion;
        // aca quedan los de validacion (y el que sobrevive al volver de ahi).
        error={error && !showConfirmDialog ? { titulo: 'Error al Crear el articulo', detalle: error } : null}
        footer={
          pagina === 1 ? (
            <>
              <button
                onClick={onCerrar}
                className='flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors cursor-pointer'
              >
                Cancelar
              </button>
              <button
                onClick={irASiguiente}
                className='flex-1 px-4 py-2 cursor-pointer text-sm font-medium text-white bg-violet-600 rounded-md hover:bg-violet-700 transition-colors'
              >
                Siguiente
              </button>
            </>
          ) : (
            <>
              <button
                onClick={volverAPrimeraPagina}
                className='flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors cursor-pointer'
              >
                Volver
              </button>
              <button
                onClick={abrirConfirmacion}
                className='flex-1 px-4 py-2 cursor-pointer text-sm font-medium text-white bg-violet-600 rounded-md hover:bg-violet-700 transition-colors'
              >
                Crear
              </button>
            </>
          )
        }
      >
        {/* La `key` remonta el contenido en cada paso, que es lo que vuelve a
        disparar la animacion de entrada. */}
        <div
          key={pagina}
          className={haciaAdelante ? 'animate-entrar-derecha' : 'animate-entrar-izquierda'}
        >
        {pagina === 1 ? (
          <div className='space-y-4'>
            {/* Código de Barra */}
            <div>
              <label className='block text-md font-medium text-black mb-2'>Código de Barra</label>

              <div className='mb-3'>
                <SegmentedToggle<'manual' | 'auto'>
                  valor={barcodeAuto ? 'auto' : 'manual'}
                  opciones={OPCIONES_BARCODE}
                  onChange={(valor) => {
                    if (valor === 'auto') {
                      setBarcodeAuto(true);
                      setBarcode('');
                    } else {
                      setBarcodeAuto(false);
                    }
                  }}
                />
              </div>

              {/* Input de Código de Barra: los primeros 6 dígitos se guardan como
              cabecera y el resto como cola. */}
              {!barcodeAuto && (
                <div className='flex items-center justify-end mb-1'>
                  <span
                    className={`text-xs transition-colors ${
                      barcode.length >= BARCODE_MAX ? 'text-red-500 opacity-100' : 'text-gray-400 opacity-70'
                    }`}
                  >
                    {barcode.length}/{BARCODE_MAX} dígitos
                  </span>
                </div>
              )}
              <div className='flex items-center'>
                <input
                  type='text'
                  value={barcode}
                  onChange={handleBarcodeChange}
                  placeholder={barcodeAuto ? 'Se generará automáticamente' : 'Sin Código de Barra'}
                  disabled={barcodeAuto}
                  maxLength={BARCODE_MAX}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors ${
                    barcodeAuto ? 'bg-gray-200 cursor-not-allowed text-gray-500' : ''
                  }`}
                />
              </div>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Detalle</label>
                <input
                  type='text'
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  maxLength={70}
                  placeholder='Sin Detalle'
                  className='w-full text-gray-700 px-3 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Color/Modelo</label>
                <input
                  type='text'
                  value={colorModelo}
                  onChange={(e) => setColorModelo(e.target.value)}
                  maxLength={50}
                  placeholder='Sin Color/Modelo'
                  className='w-full text-gray-700 px-3 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500'
                />
              </div>
            </div>

            <div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Cantidad</label>
                <input
                  type='number'
                  value={cantidad === null ? '' : cantidad}
                  onChange={handleCantidadChange}
                  placeholder='0'
                  className='w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Cant. Reservada</label>
                <input
                  type='number'
                  value={cantidadReservada === null ? '' : cantidadReservada}
                  onChange={handleCantidadReservadaChange}
                  placeholder='0'
                  className='w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Cant. Mínima</label>
                <input
                  type='number'
                  value={cantidadMinima === null ? '' : cantidadMinima}
                  onChange={handleCantidadMinimaChange}
                  placeholder='0'
                  className='w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Talle</label>
                <input
                  type='text'
                  value={talle}
                  onChange={(e) => setTalle(e.target.value)}
                  maxLength={30}
                  placeholder='Sin Talle'
                  className='w-full text-gray-700 px-3 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500'
                />
              </div>
            </div>

            <div className='flex flex-col sm:flex-row sm:items-end gap-x-4 gap-y-3'>
              <div className='sm:w-1/2'>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Precio</label>
                <input
                  type='number'
                  value={precio === null ? '' : precio}
                  onChange={handlePrecioChange}
                  placeholder='0'
                  className='w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500'
                />
              </div>

              <PreciosPorMetodo
                precio={precio ?? 0}
                metodos={metodosDePago}
                claseContenedor='select-none flex flex-wrap items-center w-fit sm:mb-0.5 gap-y-1 px-1 rounded-md border border-gray-300 shadow-lg divide-x-1 divide-gray-300'
              />
            </div>
          </div>
        ) : (
          <div className='divide-y divide-gray-200 border-b pb-7 border-gray-300'>
            <div className='pb-5'>
              <label className='block font-medium text-gray-700 mb-2'>Línea</label>
              <InlineFilterDropdown
                label='Elegir Línea'
                opciones={opcionesLinea}
                selectedId={lineaSeleccionada}
                onSelect={setLineaSeleccionada}
                onClear={() => setLineaSeleccionada(null)}
                conBuscador
              />
            </div>

            <div className='flex items-start gap-4 py-5 flex-wrap'>
              <div>
                <label className='block font-medium text-gray-700 mb-2'>
                  Grupo de Articulos <span className='text-red-500'>*</span>
                </label>
                <InlineFilterDropdown
                  label='Elegir Grupo'
                  opciones={opcionesGrupo}
                  selectedId={grupoSeleccionado}
                  onSelect={(id) => {
                    setGrupoSeleccionado(id);
                    if (error === ERROR_GRUPO_OBLIGATORIO) setError(null);
                  }}
                  onClear={() => {}}
                  // El grupo es obligatorio: solo se reemplaza por otro.
                  permitirLimpiar={false}
                  conBuscador
                />
              </div>

              {/* Se despliega desde el grupo al elegir uno que tenga subgrupos. */}
              <div
                onTransitionEnd={() => setAnimandoSubgrupo(false)}
                className={`transition-all duration-300 ease-out ${
                  mostrarSubgrupo && !animandoSubgrupo ? '' : 'overflow-hidden'
                } ${
                  mostrarSubgrupo
                    ? 'max-w-[260px] opacity-100 translate-x-0'
                    : 'max-w-0 opacity-0 -translate-x-6'
                }`}
              >
                <label className='block font-medium text-gray-700 mb-2 whitespace-nowrap'>
                  Subgrupo
                </label>
                <InlineFilterDropdown
                  label='Elegir Subgrupo'
                  opciones={opcionesSubgrupo}
                  selectedId={subgrupoSeleccionado}
                  onSelect={setSubgrupoSeleccionado}
                  onClear={() => setSubgrupoSeleccionado(null)}
                  conBuscador
                />
              </div>
            </div>

            <div className='pt-5'>
              <label className='block font-medium text-gray-700 mb-2'>Clubes/Colegios</label>
              <div className='flex items-center gap-3'>
                <button
                  type='button'
                  onClick={() => setIsClienteAssignOpen(true)}
                  className='text-sm px-2 py-1 text-nowrap border border-violet-600 text-violet-600 rounded hover:bg-amber-50 transition-colors cursor-pointer'
                >
                  Asignar a un Nuevo Club/Colegio
                </button>

                <ListaChips
                  items={clientesSeleccionados.map((c) => ({ id: c.id_cliente, nombre: c.nombre }))}
                  onQuitar={(id) =>
                    setClientesSeleccionados((prev) => prev.filter((c) => c.id_cliente !== id))
                  }
                  textoVacio='No asignado a ningún club/colegio'
                />
              </div>
            </div>
          </div>
        )}
        </div>
      </BaseModal>

      {/* Confirmacion antes de dar de alta */}
      <BaseModal
        abierto={showConfirmDialog}
        onCerrar={() => setShowConfirmDialog(false)}
        titulo='Confirmá los Datos del Artículo'
        ancho='lg'
        z='z-[60]'
        error={error ? { titulo: 'Error al Crear el articulo', detalle: error } : null}
        footer={
          <>
            <button
              onClick={() => setShowConfirmDialog(false)}
              disabled={cargando}
              className='flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50'
            >
              Volver
            </button>
            <button
              onClick={handleCreateArticle}
              disabled={cargando}
              className='flex-1 px-4 py-2 cursor-pointer text-sm font-medium text-white bg-violet-600 rounded-md hover:bg-violet-700 disabled:bg-violet-400 transition-colors'
            >
              {cargando ? 'Creando...' : 'Confirmar'}
            </button>
          </>
        }
      >
        <div className='space-y-3 bg-gray-50 p-4 rounded-md'>
          <div className='flex justify-between gap-3'>
            <span className='text-sm font-medium text-gray-700'>Código de Barra:</span>
            <span className='text-sm text-gray-900 font-semibold'>
              {barcodeAuto ? 'Automático' : barcode.trim() === '' ? 'No Asignado' : barcode}
            </span>
          </div>
          <div className='flex justify-between gap-3'>
            <span className='text-sm font-medium text-gray-700'>Detalle:</span>
            <span className='text-sm text-gray-900 font-semibold text-right'>
              {descripcion.trim() === '' ? 'Sin Detalle' : descripcion}
            </span>
          </div>
          <div className='flex justify-between gap-3'>
            <span className='text-sm font-medium text-gray-700'>Color/Modelo:</span>
            <span className='text-sm text-gray-900 font-semibold text-right'>
              {colorModelo.trim() === '' ? 'Sin Color/Modelo' : colorModelo}
            </span>
          </div>
          <div className='flex justify-between gap-3'>
            <span className='text-sm font-medium text-gray-700'>Talle:</span>
            <span className='text-sm text-gray-900 font-semibold'>{talle.trim() === '' ? 'Sin Talle' : talle}</span>
          </div>
          <div className='flex justify-between gap-3'>
            <span className='text-sm font-medium text-gray-700'>Cantidad:</span>
            <span className='text-sm text-gray-900 font-semibold'>{cantidad ?? 0}</span>
          </div>
          <div className='flex justify-between gap-3'>
            <span className='text-sm font-medium text-gray-700'>Cant. Reservada:</span>
            <span className='text-sm text-gray-900 font-semibold'>{cantidadReservada ?? 0}</span>
          </div>
          <div className='flex justify-between gap-3'>
            <span className='text-sm font-medium text-gray-700'>Cant. Mínima:</span>
            <span className='text-sm text-gray-900 font-semibold'>{cantidadMinima ?? 0}</span>
          </div>
          <div className='flex justify-between gap-3'>
            <span className='text-sm font-medium text-gray-700'>Precio:</span>
            <span className='text-sm text-gray-900 font-semibold'>{formatearPesos(precio ?? 0)}</span>
          </div>
          <div className='flex justify-between gap-3'>
            <span className='text-sm font-medium text-gray-700'>Línea:</span>
            <span className='text-sm text-gray-900 font-semibold'>{nombreLineaSeleccionada}</span>
          </div>
          <div className='flex justify-between gap-3'>
            <span className='text-sm font-medium text-gray-700'>Grupo de Articulos:</span>
            <span className='text-sm text-gray-900 font-semibold'>{nombreGrupoSeleccionado}</span>
          </div>
          <div className='flex justify-between gap-3'>
            <span className='text-sm font-medium text-gray-700'>Subgrupo:</span>
            <span className='text-sm text-gray-900 font-semibold'>{nombreSubgrupoSeleccionado}</span>
          </div>
          <div className='flex justify-between gap-3 items-center'>
            <span className='text-sm font-medium text-gray-700 shrink-0'>Clubes/Colegios:</span>
            <div className='flex justify-end'>
              <ListaChips
                items={clientesSeleccionados.map((c) => ({ id: c.id_cliente, nombre: c.nombre }))}
                textoVacio='No asignado a ningún club/colegio'
                maxVisible={MAX_CLIENTES_VISIBLES}
              />
            </div>
          </div>
        </div>
      </BaseModal>

      {/* Dialog de Éxito */}
      <BaseModal
        abierto={showSuccessDialog}
        onCerrar={handleCerrarExito}
        titulo='✓ Artículo Creado Exitosamente'
        claseTitulo='text-lg font-medium leading-6 text-green-600 mb-4 text-center'
        ancho='lg'
        z='z-[70]'
        transicionLenta
      >
        {articuloCreado && (
          <div className='space-y-3 mb-6 bg-gray-50 p-4 rounded-md'>
            <div className='flex justify-between'>
              <span className='text-sm font-medium text-gray-700'>Código de Barra:</span>
              <span className='text-sm text-gray-900 font-semibold'>
                {articuloCreado.barcode_tail ?? 'No Asignado'}
              </span>
            </div>
            <div className='flex justify-between'>
              <span className='text-sm font-medium text-gray-700'>Cantidad:</span>
              <span className='text-sm text-gray-900 font-semibold'>{articuloCreado.cant}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-sm font-medium text-gray-700'>Precio:</span>
              <span className='text-sm text-gray-900 font-semibold'>{formatearPesos(articuloCreado.precio ?? 0)}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-sm font-medium text-gray-700'>Talle:</span>
              <span className='text-sm text-gray-900 font-semibold'>{articuloCreado.talle ?? 'Sin Talle'}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-sm font-medium text-gray-700'>Línea:</span>
              <span className='text-sm text-gray-900 font-semibold'>{nombreLineaSeleccionada}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-sm font-medium text-gray-700'>Grupo de Articulos:</span>
              <span className='text-sm text-gray-900 font-semibold'>{nombreGrupoSeleccionado}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-sm font-medium text-gray-700'>Subgrupo:</span>
              <span className='text-sm text-gray-900 font-semibold'>{nombreSubgrupoSeleccionado}</span>
            </div>
            <div className='flex justify-between gap-3 items-center'>
              <span className='text-sm font-medium text-gray-700 shrink-0'>Clientes:</span>
              <div className='flex justify-end'>
                <ListaChips
                  items={clientesSeleccionados.map((c) => ({ id: c.id_cliente, nombre: c.nombre }))}
                  textoVacio='No asignado a ningún club/colegio'
                  maxVisible={MAX_CLIENTES_VISIBLES}
                />
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleCerrarExito}
          className='cursor-pointer w-full px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-md hover:bg-violet-700 transition-colors'
        >
          Volver a la Lista
        </button>
      </BaseModal>

      {/* Modal de Asignación de Clientes */}
      <SelectListModal
        abierto={isClienteAssignOpen}
        onCerrar={() => setIsClienteAssignOpen(false)}
        titulo='Asignar a un Cliente'
        opciones={clientes
          .filter((c) => !clientesSeleccionados.some((sel) => sel.id_cliente === c.id_cliente))
          .map((c) => ({ id: c.id_cliente, nombre: c.nombre }))}
        onSelect={(opcion) => {
          const cliente = clientes.find((c) => c.id_cliente === opcion.id);
          if (cliente) {
            setClientesSeleccionados((prev) => [...prev, cliente]);
          }
          setIsClienteAssignOpen(false);
        }}
      />
    </>
  );
}
