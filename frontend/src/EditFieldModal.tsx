import { useState, useEffect, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import type { TALLES, COLORES } from '../../backend/generated/prisma/client';
import type { ArticuloConRelaciones } from '../../backend/types';
import SelectListModal from './SelectListModal';

const DESCRIPCION_MAX = 50;

export type CampoEditable =
  | 'barcode'
  | 'id_talle'
  | 'cant'
  | 'cant_reservada'
  | 'stock_minimo'
  | 'precio'
  | 'id_color'
  | 'descripcion';

const CAMPO_INFO: Record<CampoEditable, { titulo: string; tipo: 'numero' | 'precio' | 'barcode' | 'descripcion' | 'talle' | 'color' }> = {
  cant: { titulo: 'Editar Cantidad', tipo: 'numero' },
  cant_reservada: { titulo: 'Editar Cantidad Reservada', tipo: 'numero' },
  stock_minimo: { titulo: 'Editar Cantidad Minima', tipo: 'numero' },
  precio: { titulo: 'Editar Precio', tipo: 'precio' },
  barcode: { titulo: 'Editar Código de Barra', tipo: 'barcode' },
  descripcion: { titulo: 'Editar Descripción', tipo: 'descripcion' },
  id_talle: { titulo: 'Editar Talle', tipo: 'talle' },
  id_color: { titulo: 'Editar Color', tipo: 'color' },
};

interface EditFieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  articulo: ArticuloConRelaciones | null;
  campo: CampoEditable | null;
  talles: TALLES[];
  colores: COLORES[];
}

export default function EditFieldModal({
  isOpen,
  onClose,
  onSuccess,
  articulo,
  campo,
  talles,
  colores,
}: EditFieldModalProps) {
  const [valorNumero, setValorNumero] = useState<number | null>(0);
  const [valorTexto, setValorTexto] = useState<string>('');
  const [valorId, setValorId] = useState<number>(0);

  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const descripcionRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen || !articulo || !campo) return;

    setError(null);

    switch (campo) {
      case 'cant':
        setValorNumero(articulo.cant);
        break;
      case 'cant_reservada':
        setValorNumero(articulo.cant_reservada ?? 0);
        break;
      case 'stock_minimo':
        setValorNumero(articulo.stock_minimo);
        break;
      case 'precio':
        setValorNumero(articulo.precio);
        break;
      case 'barcode':
        setValorTexto(articulo.barcode !== null ? String(articulo.barcode) : '');
        break;
      case 'descripcion':
        setValorTexto(articulo.descripcion ?? '');
        break;
      case 'id_talle':
        setValorId(articulo.id_talle);
        break;
      case 'id_color':
        setValorId(articulo.id_color);
        break;
    }
  }, [isOpen, articulo, campo]);

  const triggerShake = () => {
    const el = descripcionRef.current;
    if (!el) return;
    el.classList.remove('animate-shake');
    void el.offsetWidth;
    el.classList.add('animate-shake');
  };

  const handleNumeroChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setValorNumero(valor === '' ? null : campo === 'precio' ? parseFloat(valor) : parseInt(valor, 10));
  };

  const handleBarcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValorTexto(e.target.value.replace(/[^0-9]/g, ''));
  };

  const handleDescripcionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    if (valor.length > DESCRIPCION_MAX) {
      setValorTexto(valor.slice(0, DESCRIPCION_MAX));
      triggerShake();
      return;
    }
    setValorTexto(valor);
  };

  const handleConfirmar = async () => {
    if (!articulo || !campo) return;

    try {
      setIsLoading(true);
      setError(null);

      let payload: Record<string, number | string | null>;
      switch (campo) {
        case 'cant':
        case 'cant_reservada':
        case 'stock_minimo':
          payload = { [campo]: valorNumero || 0 };
          break;
        case 'precio':
          payload = { precio: valorNumero || 0 };
          break;
        case 'barcode':
          payload = { barcode: !valorTexto.trim() ? null : parseInt(valorTexto, 10) };
          break;
        case 'descripcion':
          payload = { descripcion: valorTexto.trim() === '' ? null : valorTexto };
          break;
        case 'id_talle':
        case 'id_color':
          payload = { [campo]: valorId };
          break;
      }

      const response = await fetch(`/api/articulos/${articulo.id_articulo}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.message);
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  if (!campo) return null;

  const info = CAMPO_INFO[campo];
  const caracteresRestantes = DESCRIPCION_MAX - valorTexto.length;
  const talleSeleccionado = talles.find((t) => t.id_talle === valorId) ?? null;
  const colorSeleccionado = colores.find((c) => c.id_color === valorId) ?? null;

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
              <Dialog.Panel className='w-full max-w-sm transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all'>
                <Dialog.Title as='h3' className='text-lg font-medium leading-6 text-gray-900 mb-4'>
                  {info.titulo}
                </Dialog.Title>

                {error && (
                  <div className='mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex flex-col'>
                    <span>Error al editar el articulo</span>
                    <span className='text-red-500 text-xs'>{error}</span>
                  </div>
                )}

                {info.tipo === 'numero' && (
                  <input
                    type='number'
                    value={valorNumero === null ? '' : valorNumero}
                    onChange={handleNumeroChange}
                    placeholder='0'
                    className='w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500'
                  />
                )}

                {info.tipo === 'precio' && (
                  <input
                    type='number'
                    step='0.01'
                    value={valorNumero === null ? '' : valorNumero}
                    onChange={handleNumeroChange}
                    placeholder='0.00'
                    className='w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500'
                  />
                )}

                {info.tipo === 'barcode' && (
                  <div className='flex items-center'>
                    <span className='px-2 text-gray-700'>#77900000</span>
                    <input
                      type='text'
                      value={valorTexto}
                      onChange={handleBarcodeChange}
                      placeholder='Sin Código de Barra'
                      className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500'
                    />
                  </div>
                )}

                {info.tipo === 'descripcion' && (
                  <div>
                    <div className='flex items-center justify-end mb-1'>
                      <span
                        className={`text-xs transition-colors ${
                          caracteresRestantes <= 0 ? 'text-red-500 opacity-100' : 'text-gray-400 opacity-70'
                        }`}
                      >
                        {caracteresRestantes} caracteres restantes
                      </span>
                    </div>
                    <input
                      ref={descripcionRef}
                      type='text'
                      value={valorTexto}
                      onChange={handleDescripcionChange}
                      placeholder='Descripción del artículo'
                      className='w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500'
                    />
                  </div>
                )}

                {info.tipo === 'talle' && (
                  <button
                    type='button'
                    onClick={() => setIsSelectOpen(true)}
                    className='w-full text-left px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer'
                  >
                    {talleSeleccionado ? talleSeleccionado.nombre_talle : 'Seleccionar Talle'}
                  </button>
                )}

                {info.tipo === 'color' && (
                  <button
                    type='button'
                    onClick={() => setIsSelectOpen(true)}
                    className='w-full text-left px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer'
                  >
                    {colorSeleccionado ? colorSeleccionado.nombre_color : 'Seleccionar Color'}
                  </button>
                )}

                <div className='mt-6 flex gap-3'>
                  <button
                    onClick={onClose}
                    className='flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors cursor-pointer'
                  >
                    Cerrar
                  </button>
                  <button
                    onClick={handleConfirmar}
                    disabled={isLoading}
                    className='flex-1 px-4 py-2 cursor-pointer text-sm font-medium text-white bg-violet-600 rounded-md hover:bg-violet-700 disabled:bg-violet-400 transition-colors'
                  >
                    {isLoading ? 'Guardando...' : 'Confirmar'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>

      {info.tipo === 'talle' && (
        <SelectListModal
          isOpen={isSelectOpen}
          onClose={() => setIsSelectOpen(false)}
          title='Seleccionar Talle'
          opciones={talles.map((t) => ({ id: t.id_talle, nombre: t.nombre_talle }))}
          onSelect={(opcion) => {
            setValorId(opcion.id);
            setIsSelectOpen(false);
          }}
        />
      )}

      {info.tipo === 'color' && (
        <SelectListModal
          isOpen={isSelectOpen}
          onClose={() => setIsSelectOpen(false)}
          title='Seleccionar Color'
          opciones={colores.map((c) => ({ id: c.id_color, nombre: c.nombre_color ?? `Color ${c.id_color}` }))}
          onSelect={(opcion) => {
            setValorId(opcion.id);
            setIsSelectOpen(false);
          }}
        />
      )}
    </Transition>
  );
}
