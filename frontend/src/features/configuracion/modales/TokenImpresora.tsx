import { useState } from 'react';

/**
 * Muestra el token recien generado de una impresora.
 *
 * Se ve UNA sola vez: la base guarda solo su hash, asi que si se cierra el
 * modal sin copiarlo hay que regenerarlo. Por eso el aviso es rojo y el boton
 * de copiar esta al lado del valor.
 *
 * Vive en su propio archivo porque lo usan el modal de alta y el de edicion, y
 * porque un modulo que exporta un componente no puede exportar nada mas sin
 * romper Fast Refresh.
 */
export default function TokenImpresora({ token }: { token: string }) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopiado(true);
    } catch {
      // Sin permiso de portapapeles (o sin https) queda el texto para
      // seleccionar a mano; no vale la pena molestar con un error.
      setCopiado(false);
    }
  };

  return (
    <div className='flex flex-col gap-3'>
      <div className='rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700'>
        Copiá este token ahora: <span className='font-semibold'>no se puede volver a ver</span>. Si
        se pierde, hay que generar uno nuevo.
      </div>

      <div className='flex items-center gap-2'>
        <code className='flex-1 select-all break-all rounded-md border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-800'>
          {token}
        </code>
        <button
          type='button'
          onClick={copiar}
          className='shrink-0 cursor-pointer rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700'
        >
          {copiado ? 'Copiado' : 'Copiar'}
        </button>
      </div>

      <p className='text-xs text-gray-500'>
        Pegalo en <code className='font-mono'>PRINTER_TOKEN</code> del archivo{' '}
        <code className='font-mono'>.env</code> del printer-client, en la PC donde está esa
        impresora, y volvé a correr <code className='font-mono'>install-service.ps1</code>.
      </p>
    </div>
  );
}
