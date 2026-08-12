import { useState } from 'react';

type Opciones = {
  /** Convierte el error atrapado en el mensaje a mostrar. */
  mensajeDe?: (err: unknown) => string;
};

const mensajePorDefecto = (err: unknown) =>
  err instanceof Error ? err.message : 'Error desconocido';

/**
 * Estado cargando/error + try/catch/finally de una accion async (el bloque
 * que antes se repetia en cada modal). `ejecutar` corre la accion; si lanza,
 * el mensaje queda en `error` y NO se propaga.
 */
export function useAccionAsync(opciones: Opciones = {}) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mensajeDe = opciones.mensajeDe ?? mensajePorDefecto;

  const ejecutar = async (accion: () => Promise<void>) => {
    try {
      setCargando(true);
      setError(null);
      await accion();
    } catch (err) {
      setError(mensajeDe(err));
    } finally {
      setCargando(false);
    }
  };

  return { cargando, error, setError, ejecutar };
}
