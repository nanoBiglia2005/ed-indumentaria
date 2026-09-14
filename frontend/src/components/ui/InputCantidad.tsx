import { useRef } from 'react';
import { triggerShake } from '@/utils/formato';

/**
 * Input numerico entero con botones "-" / "+" a los costados, en reemplazo de
 * las flechitas nativas del `type=number` (que en el navegador son diminutas y
 * no se descubren solas). El spinner nativo se oculta con `input-sin-spinner`
 * (definida en `index.css`).
 *
 * Solo acota por abajo (`min`, 0 por defecto): un valor menor se recorta y el
 * campo se sacude, el mismo gesto que ya usan el codigo de barra y la
 * descripcion cuando se pasan de largo. NO hay techo a proposito: recortar
 * mientras se tipea muestra un numero distinto al que se escribio, asi que un
 * limite de negocio (p. ej. no retirar mas stock del que hay) lo valida y lo
 * explica quien usa el componente, no el input.
 *
 * El campo vale solo: la etiqueta, si hace falta, la pone quien lo usa.
 */
interface InputCantidadProps {
  valor: number | null;
  onChange: (valor: number | null) => void;
  /** Piso; por defecto 0 (no hay cantidades negativas). */
  min?: number;
  /** Texto del `aria-label` del campo, para lectores de pantalla. */
  etiquetaAccesible?: string;
  autoFocus?: boolean;
}

export default function InputCantidad({
  valor,
  onChange,
  min = 0,
  etiquetaAccesible = 'Cantidad',
  autoFocus = false,
}: InputCantidadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const acotar = (n: number) => (n < min ? min : n);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const texto = e.target.value;
    if (texto === '') {
      onChange(null);
      return;
    }
    const n = parseInt(texto, 10);
    if (Number.isNaN(n)) return;
    const acotado = acotar(n);
    if (acotado !== n) triggerShake(inputRef.current);
    onChange(acotado);
  };

  const paso = (delta: number) => onChange(acotar((valor ?? 0) + delta));

  const noPuedeBajar = (valor ?? 0) <= min;

  const claseBoton =
    'w-11 shrink-0 flex items-center justify-center text-lg leading-none font-medium ' +
    'text-neutro-600 bg-neutro-100 border border-neutro-200 rounded transition-colors ' +
    'hover:bg-neutro-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer select-none';

  return (
    <div className='flex items-stretch gap-2'>
      <button
        type='button'
        onClick={() => paso(-1)}
        disabled={noPuedeBajar}
        aria-label='Restar uno'
        className={claseBoton}
      >
        &minus;
      </button>

      <input
        ref={inputRef}
        type='number'
        inputMode='numeric'
        step='1'
        min={min}
        value={valor === null ? '' : valor}
        onChange={handleChange}
        placeholder='0'
        aria-label={etiquetaAccesible}
        autoFocus={autoFocus}
        className='input-sin-spinner min-w-0 flex-1 px-3 py-2 text-center font-mono text-neutro-900 border border-neutro-200 rounded focus:outline-none focus:ring-2 focus:ring-marca-500'
      />

      <button
        type='button'
        onClick={() => paso(1)}
        aria-label='Sumar uno'
        className={claseBoton}
      >
        +
      </button>
    </div>
  );
}
