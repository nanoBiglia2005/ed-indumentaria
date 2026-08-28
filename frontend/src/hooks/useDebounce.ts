import { useEffect, useState } from 'react';

/** Copia retrasada de un valor: se actualiza recien despues de `retrasoMs`
 *  sin cambios (p. ej. la busqueda de la tabla de articulos). */
export function useDebounce<T>(valor: T, retrasoMs: number): T {
  const [debounced, setDebounced] = useState(valor);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(valor), retrasoMs);
    return () => clearTimeout(timeout);
  }, [valor, retrasoMs]);

  return debounced;
}
