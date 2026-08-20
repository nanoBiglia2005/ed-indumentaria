import { useState, useEffect, useMemo } from 'react';
import type { GRUPOS_DE_VENTA, CLIENTES_MAYORISTAS } from '@backend/types';
import { ID_GRUPO_NO_ASIGNADO } from '@backend/types';
import BaseModal from '@/components/ui/BaseModal';
import SegmentedToggle from '@/components/ui/SegmentedToggle';
import ListaChips from '@/components/ui/ListaChips';
import SelectListModal from '@/components/ui/SelectListModal';
import InlineFilterDropdown from '@/components/ui/InlineFilterDropdown';
import { useAccionAsync } from '@/hooks/useAccionAsync';
import { crearArticulo, asignarCliente } from '@/api/articulos';
import { mensajeDetallesPrimero } from '@/api/cliente';
import { BARCODE_AUTOMATICO, BARCODE_MAX } from '@/utils/barcode';

interface CreateArticleModalProps {
  abierto: boolean;
  onCerrar: () => void;
  onExito: () => void;
  grupos: GRUPOS_DE_VENTA[];
  clientes: CLIENTES_MAYORISTAS[];
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

export default function CreateArticleModal({
  abierto,
  onCerrar,
  onExito,
  grupos,
  clientes,
}: CreateArticleModalProps) {
  const [cantidad, setCantidad] = useState<number | null>(0);
  const [precio, setPrecio] = useState<number | null>(0);
  const [barcode, setBarcode] = useState<string>('');
  const [barcodeAuto, setBarcodeAuto] = useState<boolean>(false);
  const [talle, setTalle] = useState<string>('');
  const { cargando, error, setError, ejecutar } = useAccionAsync({
    mensajeDe: (err) => mensajeDetallesPrimero(err),
  });
  const [articuloCreado, setArticuloCreado] = useState<ArticuloCreado | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  // Un articulo pertenece a UN grupo. Si no se elige ninguno, queda en
  // "No Asignado" por el default de la base (ese grupo no se ofrece acá).
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<number | null>(null);
  const [clientesSeleccionados, setClientesSeleccionados] = useState<CLIENTES_MAYORISTAS[]>([]);
  const [isClienteAssignOpen, setIsClienteAssignOpen] = useState(false);

  const opcionesGrupo = useMemo(
    () =>
      grupos
        .filter((g) => g.id_grupo !== ID_GRUPO_NO_ASIGNADO)
        .map((g) => ({ id: g.id_grupo, nombre: g.nombre_grupo ?? `Grupo ${g.id_grupo}` })),
    [grupos]
  );

  const nombreGrupoSeleccionado =
    opcionesGrupo.find((o) => o.id === grupoSeleccionado)?.nombre ?? 'No Asignado';

  const resetForm = () => {
    setCantidad(0);
    setPrecio(0);
    setBarcode('');
    setBarcodeAuto(false);
    setTalle('');
    setError(null);
    setGrupoSeleccionado(null);
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

  const handlePrecioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setPrecio(valor === '' ? null : parseFloat(valor));
  };

  const handleBarcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!barcodeAuto) {
      const soloNumeros = e.target.value.replace(/[^0-9]/g, '').slice(0, BARCODE_MAX);
      setBarcode(soloNumeros);
    }
  };

  const handleCreateArticle = () => {
    ejecutar(async () => {
      const payload = {
        cant: cantidad || 0,
        precio: precio || 0,
        ...(barcodeAuto ? BARCODE_AUTOMATICO : { barcode_tail: barcode.trim() === '' ? null : barcode }),
        talle: talle.trim() === '' ? null : talle.trim(),
        stock_minimo: 0,
        vigente: true,
        cant_reservada: 0,
        ...(grupoSeleccionado !== null ? { id_grupo: grupoSeleccionado } : {}),
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
      setShowSuccessDialog(true);
    });
  };

  const handleCerrarExito = () => {
    setShowSuccessDialog(false);
    resetForm();
    onExito();
    onCerrar();
  };

  return (
    <>
      <BaseModal
        abierto={abierto}
        onCerrar={onCerrar}
        titulo='Crear Nuevo Artículo'
        ancho='md'
        permitirDesborde
        error={error ? { titulo: 'Error al Crear el articulo', detalle: error } : null}
        footer={
          <>
            <button
              onClick={onCerrar}
              className='flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors cursor-pointer'
            >
              Cancelar
            </button>
            <button
              onClick={handleCreateArticle}
              disabled={cargando}
              className='flex-1 px-4 py-2 cursor-pointer text-sm font-medium text-white bg-violet-600 rounded-md hover:bg-violet-700 disabled:bg-violet-400 transition-colors'
            >
              {cargando ? 'Creando...' : 'Crear'}
            </button>
          </>
        }
      >
        <div className='space-y-4'>
          {/* Cantidad */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Cantidad</label>
            <input
              type='number'
              value={cantidad === null ? '' : cantidad}
              onChange={handleCantidadChange}
              placeholder='0'
              className='w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500'
            />
          </div>

          {/* Precio */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Precio</label>
            <input
              type='number'
              step='0.01'
              value={precio === null ? '' : precio}
              onChange={handlePrecioChange}
              placeholder='0.00'
              className='w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500'
            />
          </div>

          {/* Talle */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Talle</label>
            <input
              type='text'
              value={talle}
              onChange={(e) => setTalle(e.target.value)}
              maxLength={30}
              placeholder='Sin Talle'
              className='w-full text-gray-700 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500'
            />
          </div>

          {/* Código de Barra */}
          <div className='mb-5'>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Código de Barra</label>

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

          {/* Grupo de Articulos */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-3'>Grupo de Articulos</label>

            <InlineFilterDropdown
              label='Elegir Grupo'
              opciones={opcionesGrupo}
              selectedId={grupoSeleccionado}
              onSelect={setGrupoSeleccionado}
              onClear={() => setGrupoSeleccionado(null)}
              conBuscador
            />

            {grupoSeleccionado === null && (
              <p className='mt-2 text-sm text-gray-400 italic'>
                Sin grupo, el artículo queda en "No Asignado".
              </p>
            )}
          </div>

          {/* Clientes */}
          <div>
            <div className='flex gap-3 items-center mb-3'>
              <label className='block text-sm font-medium text-gray-700'>Clientes</label>
              <button
                type='button'
                onClick={() => setIsClienteAssignOpen(true)}
                className='text-sm px-2 py-1 border border-violet-600 text-violet-600 rounded hover:bg-amber-50 transition-colors cursor-pointer'
              >
                Asignar a un Nuevo Cliente
              </button>
            </div>

            <ListaChips
              items={clientesSeleccionados.map((c) => ({ id: c.id_cliente, nombre: c.nombre }))}
              onQuitar={(id) =>
                setClientesSeleccionados((prev) => prev.filter((c) => c.id_cliente !== id))
              }
              textoVacio='No asignado a ningún cliente'
            />
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
              <span className='text-sm text-gray-900 font-semibold'>${articuloCreado.precio}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-sm font-medium text-gray-700'>Talle:</span>
              <span className='text-sm text-gray-900 font-semibold'>{articuloCreado.talle ?? 'Sin Talle'}</span>
            </div>
            <div className='flex justify-between gap-3 items-center'>
              <span className='text-sm font-medium text-gray-700'>Clientes:</span>
              <ul className='flex flex-wrap gap-2 flex-row-reverse'>
                {clientesSeleccionados.map((cliente) => (
                  <li
                    key={cliente.id_cliente}
                    className='flex items-center justify-between gap-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700'
                  >
                    <span>{cliente.nombre}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className='flex justify-between gap-3 items-center'>
              <span className='text-sm font-medium text-gray-700'>Grupo de Articulos:</span>
              <span className='text-sm text-gray-900 font-semibold'>{nombreGrupoSeleccionado}</span>
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
