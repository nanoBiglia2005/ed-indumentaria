import { useState, useRef } from 'react';
import type { TIPOS_DE_PAGO } from '@backend/types';
import BaseModal from '@/components/ui/BaseModal';
import { useAccionAsync } from '@/hooks/useAccionAsync';
import { useResetAlCambiar } from '@/hooks/useResetAlCambiar';
import { actualizarRecargo } from '@/api/tiposDePago';
import { mensajeDetallesPrimero } from '@/api/cliente';
import { triggerShake } from '@/utils/formato';

interface EditRecargoModalProps {
  abierto: boolean;
  onCerrar: () => void;
  onExito: (tipoDePagoActualizado: TIPOS_DE_PAGO) => void;
  tipoDePago: TIPOS_DE_PAGO | null;
}

export default function EditRecargoModal({
  abierto,
  onCerrar,
  onExito,
  tipoDePago,
}: EditRecargoModalProps) {
  const [valorTexto, setValorTexto] = useState('');
  const { cargando, error, setError, ejecutar } = useAccionAsync({
    mensajeDe: (err) => mensajeDetallesPrimero(err),
  });

  const inputRef = useRef<HTMLInputElement>(null);

  const reiniciar = () => {
    if (!abierto || !tipoDePago) return;
    setError(null);
    setValorTexto(String(tipoDePago.recargo));
  };
  useResetAlCambiar(abierto, reiniciar);
  useResetAlCambiar(tipoDePago, reiniciar);

  const handleRecargoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    // Solo digitos y un unico punto decimal, con hasta 2 decimales: sin letras ni signo negativo.
    if (!/^\d*\.?\d{0,2}$/.test(valor)) {
      triggerShake(inputRef.current);
      return;
    }
    setValorTexto(valor);
  };

  const handleConfirmar = () => {
    if (!tipoDePago) return;

    const recargo = parseFloat(valorTexto);
    if (valorTexto.trim() === '' || Number.isNaN(recargo) || recargo < 0) {
      setError('El recargo debe ser un numero mayor o igual a 0.');
      triggerShake(inputRef.current);
      return;
    }

    ejecutar(async () => {
      const tipoDePagoActualizado = await actualizarRecargo(tipoDePago.id_tipos_de_pago, recargo);
      onExito(tipoDePagoActualizado);
      onCerrar();
    });
  };

  if (!tipoDePago) return null;

  return (
    <BaseModal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={<>Editar Recargo — {tipoDePago.nombre_tipo_de_pago}</>}
      error={error ? { titulo: 'Error al editar el recargo', detalle: error } : null}
      footer={
        <>
          <button
            onClick={onCerrar}
            className='flex-1 px-4 py-2 text-sm font-medium text-neutro-600 bg-neutro-100 rounded hover:bg-neutro-200 transition-colors cursor-pointer'
          >
            Cerrar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={cargando}
            className='flex-1 px-4 py-2 cursor-pointer text-sm font-medium text-white bg-marca-500 rounded hover:bg-marca-600 disabled:bg-marca-400 transition-colors'
          >
            {cargando ? 'Guardando...' : 'Confirmar'}
          </button>
        </>
      }
    >
      <div className='flex items-center'>
        <input
          ref={inputRef}
          type='text'
          inputMode='decimal'
          value={valorTexto}
          onChange={handleRecargoChange}
          placeholder='0'
          className='w-full px-3 py-2 border border-neutro-200 rounded focus:outline-none focus:ring-2 focus:ring-marca-500'
        />
        <span className='ps-2 text-neutro-600 font-semibold'>%</span>
      </div>
    </BaseModal>
  );
}
