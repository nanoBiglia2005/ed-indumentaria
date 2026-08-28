import type { TIPOS_DE_PAGO } from '@backend/types';

interface SelectorMetodoPagoProps {
  tipos: TIPOS_DE_PAGO[];
  /** Metodo elegido, o null cuando el pago es personalizado. */
  seleccionado: number | null;
  onSeleccionar: (idTipoDePago: number) => void;
  deshabilitado?: boolean;
}

/**
 * Elige UN metodo para cobrar todo el remito.
 *
 * No usa SegmentedToggle porque ese componente esta hecho para exactamente dos
 * opciones (la pastilla animada se posiciona por mitades) y aca los metodos
 * salen de la base: si mañana hay un tercero tiene que aparecer solo.
 */
export default function SelectorMetodoPago({
  tipos,
  seleccionado,
  onSeleccionar,
  deshabilitado = false,
}: SelectorMetodoPagoProps) {
  return (
    <div className='flex w-full gap-2 rounded-lg border-2 border-gray-300 bg-gray-100 p-1'>
      {tipos.map((tipo) => {
        const activo = seleccionado === tipo.id_tipos_de_pago;

        return (
          <button
            key={tipo.id_tipos_de_pago}
            type='button'
            onClick={() => onSeleccionar(tipo.id_tipos_de_pago)}
            disabled={deshabilitado}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition-colors duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
              activo ? 'bg-violet-800 text-white' : 'text-gray-900 hover:bg-gray-200'
            }`}
          >
            {tipo.nombre_tipo_de_pago}
          </button>
        );
      })}
    </div>
  );
}
