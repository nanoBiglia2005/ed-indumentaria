import { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import type { TALLES, GRUPOS_DE_VENTA, CLIENTES } from '../../backend/generated/prisma/client';
import SelectListModal from './SelectListModal';

interface CreateArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  grupos: GRUPOS_DE_VENTA[];
  clientes: CLIENTES[];
}

interface ArticuloCreado {
  barcode: number | null;
  cant: number | null;
  precio: number | null;
  nombreTalle: string | null;
  id_articulo: number;
}

export default function CreateArticleModal({ isOpen, onClose, onSuccess, grupos, clientes }: CreateArticleModalProps) {
  const [cantidad, setCantidad] = useState<number | null>(0);
  const [precio, setPrecio] = useState<number | null>(0);
  const [barcode, setBarcode] = useState<string>('');
  const [barcodeAuto, setBarcodeAuto] = useState<boolean>(false);
  const [idTalle, setIdTalle] = useState<number>(0);
  const [talles, setTalles] = useState<TALLES[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [articuloCreado, setArticuloCreado] = useState<ArticuloCreado | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const [gruposSeleccionados, setGruposSeleccionados] = useState<GRUPOS_DE_VENTA[]>([]);
  const [clientesSeleccionados, setClientesSeleccionados] = useState<CLIENTES[]>([]);
  const [isGrupoAssignOpen, setIsGrupoAssignOpen] = useState(false);
  const [isClienteAssignOpen, setIsClienteAssignOpen] = useState(false);

  useEffect(() => {
    fetch('/api/talles')
      .then((res) => res.json())
      .then((data) => setTalles(data))
      .catch((err) => console.error('Error al obtener los talles:', err));
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setCantidad(0);
    setPrecio(0);
    setBarcode('');
    setBarcodeAuto(false);
    setIdTalle(0);
    setError(null);
    setGruposSeleccionados([]);
    setClientesSeleccionados([]);
  };


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
      const soloNumeros = e.target.value.replace(/[^0-9]/g, '');
      setBarcode(soloNumeros);
    }
  };

  const handleCreateArticle = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const payload = {
        cant: cantidad || 0,
        precio: precio || 0,
        barcode: barcodeAuto ? -1 : (!barcode.trim() ? null : parseInt(barcode,10)),
        id_talle: idTalle,
        stock_minimo: 0,

        vigente: true,
        id__medida: 1,
        id_color: 1,
        cant_reservada: 0,
      };

      const response = await fetch('/api/articulos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details);
      }

      const nuevoArticulo = await response.json();
      const id_articulo = nuevoArticulo.id_articulo;

      await Promise.all([
        ...gruposSeleccionados.map((grupo) =>
          fetch(`/api/articulos/${id_articulo}/grupos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_grupo: grupo.id_grupo }),
          })
        ),
        ...clientesSeleccionados.map((cliente) =>
          fetch(`/api/articulos/${id_articulo}/clientes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_cliente: cliente.id_cliente }),
          })
        ),
      ]);

      setArticuloCreado({
        id_articulo: nuevoArticulo.id_articulo,
        barcode: nuevoArticulo.barcode,
        cant: nuevoArticulo.cant,
        precio: nuevoArticulo.precio,
        nombreTalle: nuevoArticulo.TALLES.nombre_talle,
      });
      setShowSuccessDialog(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as='div' className='relative z-50' onClose={onClose}>
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
                  Crear Nuevo Artículo
                </Dialog.Title>

                {error && (
                  <div className='mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex flex-col'>
                    <span>Error al Crear el articulo</span>
                    <span className='text-red-500 text-xs'>{error}</span>
                  </div>
                )}

                <div className='space-y-4'>
                  {/* Cantidad */}
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Cantidad
                    </label>
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
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Precio
                    </label>
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
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Talle
                    </label>
                    <select
                      value={idTalle}
                      onChange={(e) => setIdTalle(parseInt(e.target.value, 10))}
                      className='w-full text-gray-700 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500'
                    >
                      {talles.map((talle) => (
                        <option key={talle.id_talle} value={talle.id_talle}>
                          {talle.nombre_talle}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Código de Barra */}
                  <div className='mb-5'>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Código de Barra
                    </label>

                    {/* Toggle Visual */}
                    <div className='mb-3 relative inline-flex w-full border-2 border-gray-300 rounded-lg bg-gray-100 p-1 gap-2'>
                      {/* Fondo animado */}
                      <div
                        className={`absolute top-1 bottom-1 rounded-md bg-violet-600 transition-all duration-300 ease-in-out ${
                          barcodeAuto ? 'left-1/2 right-1' : 'left-1 right-1/2'
                        }`}
                      />

                      {/* Botón Manual */}
                      <button
                        onClick={() => setBarcodeAuto(false)}
                        className={`relative flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors duration-300 cursor-pointer ${
                          !barcodeAuto
                            ? 'text-white'
                            : 'text-gray-900 hover:bg-gray-300'
                        }`}
                      >
                        Manual
                      </button>

                      {/* Botón Automático */}
                      <button
                        onClick={() => {
                          setBarcodeAuto(true);
                          setBarcode('');
                        }}
                        className={`relative flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors duration-300 cursor-pointer ${
                          barcodeAuto
                            ? 'text-white'
                            : 'text-gray-900 hover:bg-gray-300'
                        }`}
                      >
                        Automático
                      </button>
                    </div>

                    {/* Input de Código de Barra */}
                    <div className='flex items-center'>
                      <span className='px-2 text-gray-700'>#77900000</span>
                      <input
                        type='text'
                        value={barcode}
                        onChange={handleBarcodeChange}
                        placeholder={barcodeAuto ? 'Se generará automáticamente' : 'Sin Código de Barra'}
                        disabled={barcodeAuto}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors ${
                          barcodeAuto ? 'bg-gray-200 cursor-not-allowed text-gray-500' : ''
                        }`}
                      />
                    </div>                 
                  </div>

                  {/* Grupos de Articulos */}
                  <div>
                    <div className='flex gap-3 items-center mb-3'>
                      <label className='block text-sm font-medium text-gray-700'>
                        Grupos de Articulos
                      </label>
                      <button
                        type='button'
                        onClick={() => setIsGrupoAssignOpen(true)}
                        className='text-sm px-2 py-1 border border-violet-600 text-violet-600 rounded hover:bg-amber-50 transition-colors cursor-pointer'
                      >
                        Asignar a un Nuevo Grupo
                      </button>
                    </div>

                    {gruposSeleccionados.length === 0 ? (
                      <p className='text-sm text-gray-400 italic'>No asignado a ningún grupo</p>
                    ) : (
                      <ul className='flex flex-wrap gap-2'>
                        {gruposSeleccionados.map((grupo) => (
                          <li
                            key={grupo.id_grupo}
                            className='flex items-center gap-1 justify-between px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700 w-fit'
                          >
                            <span>{grupo.nombre_grupo ?? `Grupo ${grupo.id_grupo}`}</span>
                            <button
                              type='button'
                              onClick={() =>
                                setGruposSeleccionados((prev) =>
                                  prev.filter((g) => g.id_grupo !== grupo.id_grupo)
                                )
                              }
                              className='font-bold text-gray-400 hover:text-red-600 cursor-pointer px-1'
                            >
                              X
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Clientes */}
                  <div>
                    <div className='flex gap-3 items-center mb-3'>
                      <label className='block text-sm font-medium text-gray-700'>
                        Clientes
                      </label>
                      <button
                        type='button'
                        onClick={() => setIsClienteAssignOpen(true)}
                        className='text-sm px-2 py-1 border border-violet-600 text-violet-600 rounded hover:bg-amber-50 transition-colors cursor-pointer'
                      >
                        Asignar a un Nuevo Cliente
                      </button>
                    </div>

                    {clientesSeleccionados.length === 0 ? (
                      <p className='text-sm text-gray-400 italic'>No asignado a ningún cliente</p>
                    ) : (
                      <ul className='flex flex-wrap gap-2'>
                        {clientesSeleccionados.map((cliente) => (
                          <li
                            key={cliente.id_cliente}
                            className='flex items-center justify-between gap-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700'
                          >
                            <span>{cliente.nombre}</span>
                            <button
                              type='button'
                              onClick={() =>
                                setClientesSeleccionados((prev) =>
                                  prev.filter((c) => c.id_cliente !== cliente.id_cliente)
                                )
                              }
                              className='font-bold text-gray-400 hover:text-red-600 cursor-pointer px-1'
                            >
                              X
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Botones */}
                <div className='mt-6 flex gap-3'>
                  <button
                    onClick={onClose}
                    className='flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors cursor-pointer'
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreateArticle}
                    disabled={isLoading}
                    className='flex-1 px-4 py-2 cursor-pointer text-sm font-medium text-white bg-violet-600 rounded-md hover:bg-violet-700 disabled:bg-violet-400 transition-colors'
                  >
                    {isLoading ? 'Creando...' : 'Crear'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>

      {/* Dialog de Éxito */}
      <Transition appear show={showSuccessDialog} as={Fragment}>
        <Dialog as='div' className='relative z-50' onClose={() => { setShowSuccessDialog(false); resetForm(); onSuccess(); onClose(); }}>
          <Transition.Child
            as={Fragment}
            enter='ease-out duration-300'
            enterFrom='opacity-0'
            enterTo='opacity-100'
            leave='ease-in duration-200'
            leaveFrom='opacity-100'
            leaveTo='opacity-0'
          >
            <div className='fixed inset-0 bg-black/25' />
          </Transition.Child>

          <div className='fixed inset-0 overflow-y-auto'>
            <div className='flex min-h-full items-center justify-center p-4 text-center'>
              <Transition.Child
                as={Fragment}
                enter='ease-out duration-300'
                enterFrom='opacity-0 scale-95'
                enterTo='opacity-100 scale-100'
                leave='ease-in duration-200'
                leaveFrom='opacity-100 scale-100'
                leaveTo='opacity-0 scale-95'
              >
                <Dialog.Panel className='w-full max-w-lg transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all'>
                  <Dialog.Title as='h3' className='text-lg font-medium leading-6 text-green-600 mb-4 text-center'>
                    ✓ Artículo Creado Exitosamente
                  </Dialog.Title>

                  {articuloCreado && (
                    <div className='space-y-3 mb-6 bg-gray-50 p-4 rounded-md'>
                      <div className='flex justify-between'>
                        <span className='text-sm font-medium text-gray-700'>Código de Barra:</span>
                        <span className='text-sm text-gray-900 font-semibold'>
                          {articuloCreado.barcode ? '77900000'+articuloCreado.barcode : 'No Asignado'}
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
                        <span className='text-sm text-gray-900 font-semibold'>{articuloCreado.nombreTalle}</span>
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
                        <span className='text-sm font-medium text-gray-700'>Grupos de Articulos:</span>
                        <ul className='flex flex-wrap gap-2 flex-row-reverse'>
                        {gruposSeleccionados.map((grupo) => (
                          <li
                            key={grupo.id_grupo}
                            className='flex items-center justify-between gap-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700'
                          >
                            <span>{grupo.nombre_grupo}</span>
                          </li>
                        ))}
                      </ul>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setShowSuccessDialog(false);
                      resetForm();
                      onSuccess();
                      onClose();
                    }}
                    className='cursor-pointer w-full px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-md hover:bg-violet-700 transition-colors'
                  >
                    Volver a la Lista
                  </button>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Modal de Asignación de Grupos */}
      <SelectListModal
        isOpen={isGrupoAssignOpen}
        onClose={() => setIsGrupoAssignOpen(false)}
        title='Asignar a un Grupo'
        opciones={grupos
          .filter((g) => !gruposSeleccionados.some((sel) => sel.id_grupo === g.id_grupo))
          .map((g) => ({ id: g.id_grupo, nombre: g.nombre_grupo ?? `Grupo ${g.id_grupo}` }))}
        onSelect={(opcion) => {
          const grupo = grupos.find((g) => g.id_grupo === opcion.id);
          if (grupo) {
            setGruposSeleccionados((prev) => [...prev, grupo]);
          }
          setIsGrupoAssignOpen(false);
        }}
      />

      {/* Modal de Asignación de Clientes */}
      <SelectListModal
        isOpen={isClienteAssignOpen}
        onClose={() => setIsClienteAssignOpen(false)}
        title='Asignar a un Cliente'
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
    </Transition>
  );
}
