/**
 * Barra violeta de acciones masivas de la tabla de articulos (aparece cuando
 * hay articulos seleccionados, reemplazando a los headers de columnas).
 */
interface ToolbarSeleccionArticulosProps {
  cantidad: number;
  actualizando: boolean;
  onDeseleccionar: () => void;
  onVigenciaMasiva: (vigente: boolean) => void;
  onImprimir: () => void;
}

export default function ToolbarSeleccionArticulos({
  cantidad,
  actualizando,
  onDeseleccionar,
  onVigenciaMasiva,
  onImprimir,
}: ToolbarSeleccionArticulosProps) {
  return (
    <>
      <span className='text-white text-[13px] font-semibold whitespace-nowrap pr-1'>
        {cantidad} {cantidad === 1 ? 'seleccionado' : 'seleccionados'}
      </span>
      <button
        type='button'
        onClick={onDeseleccionar}
        disabled={actualizando}
        className='rounded border border-white/70 px-3 py-1 text-[13px] font-semibold text-white cursor-pointer transition-colors duration-100 ease-in hover:bg-violet-600 disabled:opacity-50 disabled:cursor-wait whitespace-nowrap'
      >
        Deseleccionar
      </button>
      <button
        type='button'
        onClick={() => onVigenciaMasiva(true)}
        disabled={actualizando}
        className='rounded border border-green-600 bg-green-600 px-3 py-1 text-[13px] font-semibold text-white cursor-pointer transition-colors duration-100 ease-in hover:bg-green-700 disabled:opacity-50 disabled:cursor-wait whitespace-nowrap'
      >
        {actualizando ? 'Actualizando...' : 'Establecer Vigente'}
      </button>
      <button
        type='button'
        onClick={() => onVigenciaMasiva(false)}
        disabled={actualizando}
        className='rounded border border-orange-500 bg-orange-500 px-3 py-1 text-[13px] font-semibold text-white cursor-pointer transition-colors duration-100 ease-in hover:bg-orange-600 disabled:opacity-50 disabled:cursor-wait whitespace-nowrap'
      >
        {actualizando ? 'Actualizando...' : 'Establecer No Vigente'}
      </button>
      <button
        type='button'
        onClick={onImprimir}
        disabled={actualizando}
        className='rounded border border-amber-500 bg-amber-500 px-3 py-1 text-[13px] font-semibold text-white cursor-pointer transition-colors duration-100 ease-in hover:bg-amber-600 disabled:opacity-50 disabled:cursor-wait whitespace-nowrap'
      >
        Imprimir
      </button>
    </>
  );
}
