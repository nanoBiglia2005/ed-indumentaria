import { useState, useEffect, useRef, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import type { TIPOS_DE_PAGO } from '../../backend/generated/prisma/client';

interface EditRecargoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (tipoDePagoActualizado: TIPOS_DE_PAGO) => void;
  tipoDePago: TIPOS_DE_PAGO | null;
}

export default function EditRecargoModal({
  isOpen,
  onClose,
  onSuccess,
  tipoDePago,
}: EditRecargoModalProps) {
  const [valorTexto, setValorTexto] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen || !tipoDePago) return;
    setError(null);
    setValorTexto(String(tipoDePago.recargo));
  }, [isOpen, tipoDePago]);

  const triggerShake = () => {
    const el = inputRef.current;
    if (!el) return;
    el.classList.remove('animate-shake');
    void el.offsetWidth;
    el.classList.add('animate-shake');
  };

  const handleRecargoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    // Solo digitos y un unico punto decimal, con hasta 2 decimales: sin letras ni signo negativo.
    if (!/^\d*\.?\d{0,2}$/.test(valor)) {
      triggerShake();
      return;
    }
    setValorTexto(valor);
  };

  const handleConfirmar = async () => {
    if (!tipoDePago) return;

    const recargo = parseFloat(valorTexto);
    if (valorTexto.trim() === '' || Number.isNaN(recargo) || recargo < 0) {
      setError('El recargo debe ser un numero mayor o igual a 0.');
      triggerShake();
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/tipos-de-pago/${tipoDePago.id_tipos_de_pago}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recargo }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.message);
      }

      const tipoDePagoActualizado = await response.json();
      onSuccess(tipoDePagoActualizado);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  if (!tipoDePago) return null;

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
                  Editar Recargo — {tipoDePago.nombre_tipo_de_pago}
                </Dialog.Title>

                {error && (
                  <div className='mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex flex-col'>
                    <span>Error al editar el recargo</span>
                    <span className='text-red-500 text-xs'>{error}</span>
                  </div>
                )}

                <div className='flex items-center'>
                  <input
                    ref={inputRef}
                    type='text'
                    inputMode='decimal'
                    value={valorTexto}
                    onChange={handleRecargoChange}
                    placeholder='0'
                    className='w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500'
                  />
                  <span className='ps-2 text-gray-700 font-semibold'>%</span>
                </div>

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
