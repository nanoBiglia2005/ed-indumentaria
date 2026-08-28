import { useCallback, useEffect, useState } from 'react';

/**
 * Carga una lista al montar y expone { datos, cargando, error, recargar }
 * (el triplete que antes se repetia en cada pagina).
 *
 * `fetcher` debe ser una referencia estable (una funcion de src/api/, no una
 * arrow inline), si no `recargar` se recrea en cada render.
 * `mensajeError` es lo que ve el usuario; `log` (opcional) el texto del
 * console.error si difiere.
 */
export function useFetchLista<T>(fetcher: () => Promise<T[]>, mensajeError: string, log?: string) {
  const [datos, setDatos] = useState<T[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(() => {
    setCargando(true);
    fetcher()
      .then((data) => {
        setDatos(data);
        setError(null);
      })
      .catch((err) => {
        console.error(`${log ?? mensajeError}:`, err);
        setError(mensajeError);
      })
      .finally(() => setCargando(false));
  }, [fetcher, mensajeError, log]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  // setDatos queda expuesto para actualizaciones optimistas puntuales
  // (p. ej. reemplazar un tipo de pago recien editado sin refetch).
  return { datos, cargando, error, recargar, setDatos };
}
