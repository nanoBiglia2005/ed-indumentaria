import { useState, useEffect, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import type { ARTICULOS } from '../../backend/generated/prisma/client';
import { BARCODE_TAIL_MAX } from './barcodeUtils';

const DESCRIPCION_MAX = 70;
const TALLE_MAX = 30;

export type CampoEditable =
  | 'barcode'
  | 'talle'
  | 'cant'
  | 'cant_reservada'
  | 'stock_minimo'
  | 'precio'
  | 'descripcion'
  | 'detalle';

const CAMPO_INFO: Record<
  CampoEditable,
  { titulo: string; tipo: 'numero' | 'precio' | 'barcode' | 'descripcion' | 'talle' | 'color'; placeholder?: string }
> = {
  cant: { titulo: 'Editar Cantidad', tipo: 'numero' },
  cant_reservada: { titulo: 'Editar Cantidad Reservada', tipo: 'numero' },
  stock_minimo: { titulo: 'Editar Cantidad Minima', tipo: 'numero' },
  precio: { titulo: 'Editar Precio', tipo: 'precio' },
  barcode: { titulo: 'Editar Código de Barra', tipo: 'barcode' },
  descripcion: { titulo: 'Editar Nombre', tipo: 'descripcion', placeholder: 'Nombre del artículo' },
  detalle: { titulo: 'Editar Detalle', tipo: 'descripcion', placeholder: 'Detalle del artículo' },
  talle: { titulo: 'Editar Talle', tipo: 'talle' },
};

interface EditFieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  articulo: ARTICULOS | null;
  campo: CampoEditable | null;
}

export default function EditFieldModal({
  isOpen,
  onClose,
  onSuccess,
  articulo,
  campo,
}: EditFieldModalProps) {
  const [valorNumero, setValorNumero] = useState<number | null>(0);
  const [valorTexto, setValorTexto] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const descripcionRef = useRef<HTMLInputElement>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);

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
        setValorTexto(articulo.barcode_tail ?? '');
        break;
      case 'descripcion':
        setValorTexto(articulo.descripcion ?? '');
        break;
      case 'detalle':
        setValorTexto(articulo.detalle ?? '');
        break;
      case 'talle':
        setValorTexto(articulo.talle ?? '');
        break;
    }
  }, [isOpen, articulo, campo]);

  const triggerShake = (ref: React.RefObject<HTMLInputElement | null>) => {
    const el = ref.current;
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
    const soloNumeros = e.target.value.replace(/[^0-9]/g, '');
    if (soloNumeros.length > BARCODE_TAIL_MAX) {
      setValorTexto(soloNumeros.slice(0, BARCODE_TAIL_MAX));
      triggerShake(barcodeRef);
      return;
    }
    setValorTexto(soloNumeros);
  };

  const handleDescripcionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    if (valor.length > DESCRIPCION_MAX) {
      setValorTexto(valor.slice(0, DESCRIPCION_MAX));
      triggerShake(descripcionRef);
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
          payload = { barcode_tail: valorTexto.trim() === '' ? null : valorTexto.trim() };
          break;
        case 'descripcion':
          payload = { descripcion: valorTexto.trim() === '' ? null : valorTexto };
          break;
        case 'detalle':
          payload = { detalle: valorTexto.trim() === '' ? null : valorTexto };
          break;
        case 'talle':
          payload = { talle: valorTexto.trim() === '' ? null : valorTexto.trim() };
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
                  <div>
                    <div className='flex items-center justify-end mb-1'>
                      <span
                        className={`text-xs transition-colors ${
                          valorTexto.length >= BARCODE_TAIL_MAX ? 'text-red-500 opacity-100' : 'text-gray-400 opacity-70'
                        }`}
                      >
                        {valorTexto.length}/{BARCODE_TAIL_MAX} dígitos
                      </span>
                    </div>
                    <div className='flex items-center gap-2'>
                      {articulo?.barcode_header && (
                        <span className='shrink-0 px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-500 text-sm'>
                          {articulo.barcode_header}
                        </span>
                      )}
                      <input
                        ref={barcodeRef}
                        type='text'
                        value={valorTexto}
                        onChange={handleBarcodeChange}
                        placeholder='Sin numeración'
                        maxLength={BARCODE_TAIL_MAX}
                        className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500'
                      />
                    </div>
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
                      placeholder={info.placeholder ?? 'Nombre del artículo'}
                      className='w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500'
                    />
                  </div>
                )}

                {info.tipo === 'talle' && (
                  <input
                    type='text'
                    value={valorTexto}
                    onChange={(e) => setValorTexto(e.target.value.slice(0, TALLE_MAX))}
                    maxLength={TALLE_MAX}
                    placeholder='Sin Talle'
                    className='w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500'
                  />
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
    </Transition>
  );
}
