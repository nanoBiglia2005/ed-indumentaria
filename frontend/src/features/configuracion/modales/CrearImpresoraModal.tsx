import { useState } from 'react';
import BaseModal from '@/components/ui/BaseModal';
import TokenImpresora from './TokenImpresora';
import { useAccionAsync } from '@/hooks/useAccionAsync';
import { useResetAlCambiar } from '@/hooks/useResetAlCambiar';
import { crearImpresora } from '@/api/impresoras';
import { mensajeDetallesPrimero } from '@/api/cliente';
import { NOMBRE_IMPRESORA_MAX } from '@backend/types';

interface CrearImpresoraModalProps {
  abierto: boolean;
  onCerrar: () => void;
  /** Se llama al cerrar, no al crear: la lista se refresca una sola vez. */
  onExito: () => void;
}

/**
 * Alta de una impresora. Tiene dos pasos en el mismo modal: el nombre y, una
 * vez creada, el token. No se puede cerrar el segundo paso "sin querer" con el
 * boton de confirmar, porque el token no se puede recuperar despues.
 */
export default function CrearImpresoraModal({
  abierto,
  onCerrar,
  onExito,
}: CrearImpresoraModalProps) {
  const [nombre, setNombre] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const { cargando, error, setError, ejecutar } = useAccionAsync({
    mensajeDe: (err) => mensajeDetallesPrimero(err),
  });

  // Cada apertura arranca limpia: si no, se veria el token de la impresora
  // anterior al volver a abrir.
  useResetAlCambiar(abierto, () => {
    setNombre('');
    setToken(null);
    setError(null);
  });

  const handleCrear = () =>
    ejecutar(async () => {
      const { token: tokenNuevo } = await crearImpresora({ nombre: nombre.trim() });
      setToken(tokenNuevo);
    });

  const handleCerrar = () => {
    if (token) onExito();
    onCerrar();
  };

  return (
    <BaseModal
      abierto={abierto}
      onCerrar={handleCerrar}
      titulo={token ? 'Token de la impresora' : 'Nueva impresora'}
      error={error ? { titulo: 'No se pudo crear la impresora', detalle: error } : null}
      ancho='md'
      footer={
        token ? (
          <button
            onClick={handleCerrar}
            className='flex-1 cursor-pointer rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700'
          >
            Ya lo copié, cerrar
          </button>
        ) : (
          <>
            <button
              onClick={handleCerrar}
              className='flex-1 cursor-pointer rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200'
            >
              Cancelar
            </button>
            <button
              onClick={handleCrear}
              disabled={cargando || nombre.trim() === ''}
              className='flex-1 cursor-pointer rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-violet-400'
            >
              {cargando ? 'Creando...' : 'Crear'}
            </button>
          </>
        )
      }
    >
      {token ? (
        <TokenImpresora token={token} />
      ) : (
        <div className='flex flex-col gap-2'>
          <label className='text-sm font-medium text-gray-700' htmlFor='nombre-impresora'>
            Nombre
          </label>
          <input
            id='nombre-impresora'
            type='text'
            autoFocus
            value={nombre}
            maxLength={NOMBRE_IMPRESORA_MAX}
            onChange={(e) => setNombre(e.target.value)}
            placeholder='Mostrador'
            className='w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500'
          />
          <p className='text-xs text-gray-500'>
            Un nombre que identifique la PC donde está la impresora. Es lo que se ve al elegir
            dónde imprimir.
          </p>
        </div>
      )}
    </BaseModal>
  );
}
