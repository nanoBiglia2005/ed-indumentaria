import { useState } from 'react';
import type { RemitoConDetalles } from '@backend/types';
import BaseModal from '@/components/ui/BaseModal';
import SelectorImpresora from '@/components/ui/SelectorImpresora';
import { useImpresoras } from '@/hooks/useImpresoras';
import { useAccionAsync } from '@/hooks/useAccionAsync';
import { useResetAlCambiar } from '@/hooks/useResetAlCambiar';
import { reimprimirRemito } from '@/api/remitos';
import { mensajeDetallesPrimero } from '@/api/cliente';

interface ReimprimirRemitoModalProps {
  abierto: boolean;
  onCerrar: () => void;
  /** Remito a reimprimir; el modal no se muestra sin uno. */
  remito: RemitoConDetalles | null;
}

/**
 * Vuelve a imprimir el ticket de una venta ya registrada.
 *
 * Cubre los dos casos que antes no tenian salida: la impresora estaba
 * desconectada cuando se hizo la venta, o el ticket salio en la impresora
 * equivocada. El ticket se arma con los precios CONGELADOS del remito, asi que
 * sale igual que el original aunque el articulo haya cambiado de precio.
 */
export default function ReimprimirRemitoModal({
  abierto,
  onCerrar,
  remito,
}: ReimprimirRemitoModalProps) {
  const impresoras = useImpresoras();
  const [listo, setListo] = useState(false);
  const { cargando, error, setError, ejecutar } = useAccionAsync({
    mensajeDe: (err) => mensajeDetallesPrimero(err, 'No se pudo reimprimir el remito.'),
  });

  useResetAlCambiar(abierto, () => {
    setListo(false);
    setError(null);
  });

  if (!remito) return null;

  const handleReimprimir = () =>
    ejecutar(async () => {
      await reimprimirRemito(remito.id_remito, impresoras.seleccionada);
      setListo(true);
    });

  const codigo = `${remito.cod_mes}-${remito.cod_remito_final}`;

  return (
    <BaseModal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={`Reimprimir remito ${codigo}`}
      error={error ? { titulo: 'No se pudo reimprimir', detalle: error } : null}
      ancho='sm'
      // El selector despliega por fuera del panel.
      permitirDesborde
      // Se abre encima de VentaExitosaModal cuando se reintenta una impresion
      // fallida; suelto en el historial, el z mas alto no molesta.
      z='z-[60]'
      footer={
        <>
          <button
            onClick={onCerrar}
            className='flex-1 cursor-pointer rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200'
          >
            {listo ? 'Cerrar' : 'Cancelar'}
          </button>
          <button
            onClick={handleReimprimir}
            disabled={cargando}
            className='flex-1 cursor-pointer rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-violet-400'
          >
            {cargando ? 'Imprimiendo...' : listo ? 'Imprimir de nuevo' : 'Imprimir'}
          </button>
        </>
      }
    >
      <div className='flex flex-col gap-4'>
        <p className='text-sm text-gray-600'>
          Se imprime el mismo ticket que se emitió al registrar la venta, con los precios de ese
          momento.
        </p>

        <SelectorImpresora
          impresoras={impresoras.impresoras}
          valor={impresoras.seleccionada}
          onChange={impresoras.setSeleccionada}
          puedeElegir={impresoras.puedeElegir}
          deshabilitado={cargando}
        />

        {listo && (
          <p className='rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700'>
            El ticket se envió a la impresora.
          </p>
        )}
      </div>
    </BaseModal>
  );
}
