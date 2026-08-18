import { useRef, useState } from 'react';
import type { ArticuloDeVenta } from '@/types/ventas';
import BaseModal from '@/components/ui/BaseModal';
import { ApiError, mensajeDetallesPrimero } from '@/api/cliente';
import { buscarArticuloPorCodigo } from '@/api/ventaPrueba';
import { useAccionAsync } from '@/hooks/useAccionAsync';
import { useResetAlCambiar } from '@/hooks/useResetAlCambiar';
import { BARCODE_MAX } from '@/utils/barcode';

interface BuscarPorCodigoModalProps {
  abierto: boolean;
  onCerrar: () => void;
  /** Ids ya agregados a la venta: se avisa en vez de agregarlos dos veces. */
  articulosExcluidos: number[];
  /** El articulo encontrado; el que abre el modal decide que hacer con el. */
  onEncontrado: (articulo: ArticuloDeVenta) => void;
}

/**
 * Alta de un articulo por su codigo de barra completo.
 *
 * Esta pensado para el lector: el foco arranca en el input y el lector termina
 * el codigo con un Enter, que es el submit del formulario. Por eso el campo
 * acepta solo digitos y el resultado (encontrado / no encontrado) se muestra
 * SIN cerrar el modal, para poder seguir escaneando.
 */
export default function BuscarPorCodigoModal({
  abierto,
  onCerrar,
  articulosExcluidos,
  onEncontrado,
}: BuscarPorCodigoModalProps) {
  const [codigo, setCodigo] = useState('');
  // Resultado esperado que no es un error del sistema (no existe, no vigente,
  // ya agregado): va como aviso al pie del campo, no como banner rojo.
  const [aviso, setAviso] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { cargando, error, ejecutar } = useAccionAsync({
    mensajeDe: (err) => mensajeDetallesPrimero(err, 'No se pudo buscar el artículo.'),
  });

  useResetAlCambiar(abierto, () => {
    setCodigo('');
    setAviso(null);
  });

  // Deja el codigo seleccionado: el proximo escaneo lo pisa entero sin tener
  // que borrarlo a mano.
  const seleccionarCodigo = () => inputRef.current?.select();

  const handleCambio = (valor: string) => {
    setCodigo(valor.replace(/\D/g, '').slice(0, BARCODE_MAX));
    setAviso(null);
  };

  const handleBuscar = () =>
    ejecutar(async () => {
      setAviso(null);

      let articulo: ArticuloDeVenta;
      try {
        articulo = await buscarArticuloPorCodigo(codigo);
      } catch (err) {
        // 404 = no hay ningun articulo vigente con ese codigo. Es el caso
        // normal de un codigo mal tipeado, asi que se muestra el mensaje de la
        // ruta y el modal queda listo para el siguiente intento.
        if (err instanceof ApiError && err.status === 404) {
          setAviso(err.message);
          seleccionarCodigo();
          return;
        }
        throw err;
      }

      if (articulosExcluidos.includes(articulo.id_articulo)) {
        setAviso(
          `"${articulo.descripcion ?? 'Ese artículo'}" ya está agregado a la venta. Cambiá la cantidad desde la lista.`
        );
        seleccionarCodigo();
        return;
      }

      onEncontrado(articulo);
    });

  const puedeBuscar = codigo !== '' && !cargando;

  return (
    <BaseModal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo='Agregar por Código de Barras'
      ancho='md'
      z='z-[60]'
      clasePanel='select-none'
      error={error ? { titulo: 'Error al buscar el artículo', detalle: error } : null}
      footer={
        <button
          type='button'
          onClick={onCerrar}
          className='w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors cursor-pointer'
        >
          Cerrar
        </button>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (puedeBuscar) handleBuscar();
        }}
        className='flex flex-col gap-3'
      >
        <label htmlFor='codigo-de-barras' className='text-sm text-gray-500'>
          Escaneá el código o escribilo y presioná Buscar.
        </label>

        <div className='flex flex-col gap-2 sm:flex-row'>
          <input
            id='codigo-de-barras'
            ref={inputRef}
            type='text'
            inputMode='numeric'
            autoComplete='off'
            autoFocus
            value={codigo}
            onChange={(e) => handleCambio(e.target.value)}
            placeholder='Código de barras...'
            className='flex-1 min-w-0 rounded-md border border-gray-300 px-3 py-2 text-lg tracking-wider text-gray-800 placeholder:text-base placeholder:tracking-normal placeholder:text-gray-400 transition-colors duration-100 ease-in hover:border-violet-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30'
          />
          <button
            type='submit'
            disabled={!puedeBuscar}
            className='px-6 py-2 text-sm font-medium text-white bg-violet-600 rounded-md hover:bg-violet-700 disabled:bg-violet-300 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0'
          >
            {cargando ? 'Buscando...' : 'Buscar'}
          </button>
        </div>

        {aviso && (
          <div className='rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700'>
            {aviso}
          </div>
        )}
      </form>
    </BaseModal>
  );
}
