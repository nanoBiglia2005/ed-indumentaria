import type { TIPOS_DE_PAGO } from '@backend/types';
import { precioConRecargo } from '@/utils/precios';
import { formatearPesos } from '@/utils/formato';

/** Lo tipeado en los dos inputs de un metodo ('' = vacio). */
export interface ValoresPago {
  inicial: string;
  final: string;
}

interface TablaPersonalizadoProps {
  tipos: TIPOS_DE_PAGO[];
  valores: Record<number, ValoresPago>;
  /** Reparto sugerido de lo que falta, por metodo vacio (es el placeholder). */
  sugerencias: Map<number, number>;
  restante: number;
  onCambiarInicial: (idTipoDePago: number, valor: string) => void;
  onCambiarFinal: (idTipoDePago: number, valor: string) => void;
  /** Al salir del campo, el importe se acomoda al que se va a cobrar de verdad. */
  onSalirDeFinal: (idTipoDePago: number) => void;
  deshabilitado?: boolean;
}

/**
 * Reparto del precio de la venta entre los metodos de pago. Un renglon por
 * metodo existente en la base, no hardcodeado.
 *
 * Las dos columnas son la misma plata vista de dos formas: lo que se imputa a
 * la venta y lo que se cobra con el recargo de ese metodo. Al escribir en una,
 * la otra se completa sola.
 */
export default function TablaPersonalizado({
  tipos,
  valores,
  sugerencias,
  restante,
  onCambiarInicial,
  onCambiarFinal,
  onSalirDeFinal,
  deshabilitado = false,
}: TablaPersonalizadoProps) {
  const claseInput =
    'w-28 rounded border px-3 py-1.5 text-center text-sm transition-colors duration-100 ease-in focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <div className='overflow-x-auto rounded-b border border-neutro-200'>
      <table className='w-full min-w-[28rem]'>
        <thead>
          <tr className='border-b border-neutro-200 bg-neutro-100 text-sm text-neutro-600'>
            <th className='px-4 py-3 text-left font-semibold'>Método de Pago</th>
            <th className='px-4 py-2 text-center font-semibold'>
              <span className='block'>Monto Inicial</span>
              {/* Lo que todavia falta imputar: mientras no sea 0 no se puede cobrar. */}
              <span
                className={`block text-xs font-medium ${
                  restante === 0 ? 'text-green-600' : 'text-neutro-400'
                }`}
              >
                ({formatearPesos(restante)} Restantes)
              </span>
            </th>
            <th className='px-4 py-3 text-center font-semibold'>Monto a Cobrar</th>
          </tr>
        </thead>

        <tbody className='divide-y divide-neutro-200'>
          {tipos.map((tipo) => {
            const id = tipo.id_tipos_de_pago;
            const valor = valores[id] ?? { inicial: '', final: '' };
            const sugerido = sugerencias.get(id) ?? 0;
            // Fila sin cargar: se muestra en gris con el reparto sugerido.
            const vacia = valor.inicial === '';

            return (
              <tr key={id} className={vacia ? 'bg-neutro-50/60' : ''}>
                <td className='px-4 py-3 text-left font-semibold text-neutro-900'>
                  {tipo.nombre_tipo_de_pago}{' '}
                  {tipo.recargo > 0 && <span>({tipo.recargo}% de Recargo)</span>}
                </td>

                <td className='px-4 py-2 text-center'>
                  <input
                    type='text'
                    inputMode='numeric'
                    autoComplete='off'
                    value={valor.inicial}
                    disabled={deshabilitado}
                    onChange={(e) => onCambiarInicial(id, e.target.value)}
                    placeholder={String(sugerido)}
                    aria-label={`Monto inicial en ${tipo.nombre_tipo_de_pago}`}
                    className={`${claseInput} border-neutro-400 text-neutro-900 placeholder:text-neutro-400 hover:border-acento-500 focus:border-acento-500 focus:ring-acento-500/40`}
                  />
                </td>

                <td className='px-4 py-2 text-center'>
                  <input
                    type='text'
                    inputMode='numeric'
                    autoComplete='off'
                    value={valor.final}
                    disabled={deshabilitado}
                    onChange={(e) => onCambiarFinal(id, e.target.value)}
                    onBlur={() => onSalirDeFinal(id)}
                    placeholder={String(precioConRecargo(sugerido, tipo.recargo))}
                    aria-label={`Monto a cobrar en ${tipo.nombre_tipo_de_pago}`}
                    className={`${claseInput} border-marca-400 font-semibold text-marca-700 placeholder:font-normal placeholder:text-marca-400 hover:border-marca-500 focus:border-marca-500 focus:ring-marca-500/30`}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
