import { useState } from 'react';

/**
 * Set de ids seleccionados con toggle: agrega si falta, quita si esta.
 * Devuelve tambien el setter crudo para resets/select-all.
 */
export function useToggleSet<T>(inicial?: Set<T>) {
  const [seleccionados, setSeleccionados] = useState<Set<T>>(inicial ?? new Set());

  const toggle = (id: T) => {
    setSeleccionados((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });
  };

  return { seleccionados, toggle, setSeleccionados };
}
