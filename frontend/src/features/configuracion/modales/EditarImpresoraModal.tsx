import { useState } from 'react';
import BaseModal from '@/components/ui/BaseModal';
import TokenImpresora from './TokenImpresora';
import { useAccionAsync } from '@/hooks/useAccionAsync';
import { useResetAlCambiar } from '@/hooks/useResetAlCambiar';
import { useCuentaRegresiva } from '@/hooks/useCuentaRegresiva';
import { actualizarImpresora, regenerarToken } from '@/api/impresoras';
import { mensajeDetallesPrimero } from '@/api/cliente';
import { NOMBRE_IMPRESORA_MAX } from '@backend/types';
import type { Impresora } from '@/types/impresoras';

interface EditarImpresoraModalProps {
  abierto: boolean;
  onCerrar: () => void;
  onExito: () => void;
  impresora: Impresora | null;
}

export default function EditarImpresoraModal({
  abierto,
  onCerrar,
  onExito,
  impresora,
}: EditarImpresoraModalProps) {
  const [nombre, setNombre] = useState('');
  const [activa, setActiva] = useState(true);
  const [predeterminada, setPredeterminada] = useState(false);
  const [confirmandoToken, setConfirmandoToken] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const { cargando, error, setError, ejecutar } = useAccionAsync({
    mensajeDe: (err) => mensajeDetallesPrimero(err),
  });

  // Regenerar el token deja a esa PC sin imprimir hasta que alguien vaya a
  // editar su .env: la espera obliga a leer el aviso.
  const segundos = useCuentaRegresiva(confirmandoToken);

  useResetAlCambiar(impresora, () => {
    setNombre(impresora?.nombre ?? '');
    setActiva(impresora?.activa ?? true);
    setPredeterminada(impresora?.es_predeterminada ?? false);
    setConfirmandoToken(false);
    setToken(null);
    setError(null);
  });

  if (!impresora) return null;

  const handleGuardar = () =>
    ejecutar(async () => {
      await actualizarImpresora(impresora.id_impresora, {
        nombre: nombre.trim(),
        activa,
        // Solo se manda cuando se la esta marcando: el backend no sabe
        // "desmarcar" una predeterminada, se marca otra.
        ...(predeterminada && !impresora.es_predeterminada && { es_predeterminada: true }),
      });
      onExito();
      onCerrar();
    });

  const handleRegenerar = () =>
    ejecutar(async () => {
      const { token: tokenNuevo } = await regenerarToken(impresora.id_impresora);
      setToken(tokenNuevo);
      setConfirmandoToken(false);
    });

  const handleCerrar = () => {
    if (token) onExito();
    onCerrar();
  };

  return (
    <BaseModal
      abierto={abierto}
      onCerrar={handleCerrar}
      titulo={token ? 'Token nuevo' : `Editar ${impresora.nombre}`}
      error={error ? { titulo: 'No se pudo guardar', detalle: error } : null}
      ancho='md'
      footer={
        token ? (
          <button
            onClick={handleCerrar}
            className='flex-1 cursor-pointer rounded bg-marca-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-marca-600'
          >
            Ya lo copié, cerrar
          </button>
        ) : (
          <>
            <button
              onClick={handleCerrar}
              className='flex-1 cursor-pointer rounded bg-neutro-100 px-4 py-2 text-sm font-medium text-neutro-600 transition-colors hover:bg-neutro-200'
            >
              Cancelar
            </button>
            <button
              onClick={handleGuardar}
              disabled={cargando || nombre.trim() === ''}
              className='flex-1 cursor-pointer rounded bg-marca-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-marca-600 disabled:cursor-not-allowed disabled:bg-marca-400'
            >
              {cargando ? 'Guardando...' : 'Guardar'}
            </button>
          </>
        )
      }
    >
      {token ? (
        <TokenImpresora token={token} />
      ) : (
        <div className='flex flex-col gap-4'>
          <div className='flex flex-col gap-2'>
            <label className='text-sm font-medium text-neutro-600' htmlFor='editar-nombre-impresora'>
              Nombre
            </label>
            <input
              id='editar-nombre-impresora'
              type='text'
              value={nombre}
              maxLength={NOMBRE_IMPRESORA_MAX}
              onChange={(e) => setNombre(e.target.value)}
              className='w-full rounded border border-neutro-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-marca-500'
            />
          </div>

          <label className='flex items-start gap-3 text-sm text-neutro-600'>
            <input
              type='checkbox'
              checked={activa}
              disabled={impresora.es_predeterminada}
              onChange={(e) => setActiva(e.target.checked)}
              className='mt-0.5 h-4 w-4 accent-marca-500 disabled:opacity-50'
            />
            <span>
              Activa
              {impresora.es_predeterminada && (
                <span className='block text-xs text-neutro-400'>
                  La impresora predeterminada no se puede desactivar. Marcá otra como
                  predeterminada primero.
                </span>
              )}
            </span>
          </label>

          <label className='flex items-start gap-3 text-sm text-neutro-600'>
            <input
              type='checkbox'
              checked={predeterminada}
              disabled={impresora.es_predeterminada || !activa}
              onChange={(e) => setPredeterminada(e.target.checked)}
              className='mt-0.5 h-4 w-4 accent-marca-500 disabled:opacity-50'
            />
            <span>
              Predeterminada
              <span className='block text-xs text-neutro-400'>
                Es donde imprimen los empleados y todo lo que no elige impresora.
              </span>
            </span>
          </label>

          <div className='border-t border-neutro-200 pt-4'>
            {confirmandoToken ? (
              <div className='flex flex-col gap-3'>
                <div className='rounded border border-acento-500 bg-acento-100 p-3 text-sm text-acento-800'>
                  El token actual deja de funcionar y esa PC no va a imprimir hasta que pegues el
                  nuevo en su archivo <code className='font-mono'>.env</code>.
                </div>
                <div className='flex gap-3'>
                  <button
                    onClick={() => setConfirmandoToken(false)}
                    className='flex-1 cursor-pointer rounded bg-neutro-100 px-4 py-2 text-sm font-medium text-neutro-600 transition-colors hover:bg-neutro-200'
                  >
                    Mejor no
                  </button>
                  <button
                    onClick={handleRegenerar}
                    disabled={cargando || segundos > 0}
                    className='flex-1 cursor-pointer rounded bg-acento-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-acento-600 disabled:cursor-not-allowed disabled:bg-acento-500/50'
                  >
                    {segundos > 0 ? `Regenerar (${segundos})` : 'Regenerar'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmandoToken(true)}
                className='cursor-pointer text-sm font-medium text-acento-600 underline-offset-2 hover:underline'
              >
                Regenerar token
              </button>
            )}
          </div>
        </div>
      )}
    </BaseModal>
  );
}
