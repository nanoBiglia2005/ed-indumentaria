/**
 * Toggle segmentado de dos opciones con la pastilla violeta animada.
 * Es el patron que antes estaba copiado en PaymentToggle, CrearAgrupacionModal
 * (Colegio/Club) y CreateArticleModal (Manual/Automatico).
 */
interface SegmentedToggleProps<T extends string | number> {
  valor: T;
  opciones: readonly [{ valor: T; etiqueta: string }, { valor: T; etiqueta: string }];
  onChange: (valor: T) => void;
  /** Version chica, para toggles por fila. */
  compacto?: boolean;
}

export default function SegmentedToggle<T extends string | number>({
  valor,
  opciones,
  onChange,
  compacto = false,
}: SegmentedToggleProps<T>) {
  const esSegunda = valor === opciones[1].valor;

  const padding = compacto ? 'p-0.5' : 'p-1';
  const bordes = compacto ? 'top-0.5 bottom-0.5' : 'top-1 bottom-1';
  const posicion = esSegunda
    ? compacto
      ? 'left-1/2 right-0.5'
      : 'left-1/2 right-1'
    : compacto
    ? 'left-0.5 right-1/2'
    : 'left-1 right-1/2';
  const textoBoton = compacto ? 'px-2 py-0.5 text-xs' : 'px-3 py-2 text-sm';

  const claseBoton = (activo: boolean) =>
    `relative flex-1 font-medium rounded-md transition-colors duration-300 cursor-pointer ${textoBoton} ${
      activo ? 'text-white' : 'text-gray-900 hover:bg-gray-300'
    }`;

  return (
    <div
      className={`relative inline-flex w-full border-2 border-gray-300 rounded-lg bg-gray-100 gap-2 ${padding}`}
    >
      {/* Fondo animado */}
      <div
        className={`absolute rounded-md bg-violet-600 transition-all duration-300 ease-in-out ${bordes} ${posicion}`}
      />

      <button type='button' onClick={() => onChange(opciones[0].valor)} className={claseBoton(!esSegunda)}>
        {opciones[0].etiqueta}
      </button>

      <button type='button' onClick={() => onChange(opciones[1].valor)} className={claseBoton(esSegunda)}>
        {opciones[1].etiqueta}
      </button>
    </div>
  );
}
