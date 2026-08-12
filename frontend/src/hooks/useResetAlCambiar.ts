import { useState } from 'react';

/**
 * Ejecuta `reset` cuando `valor` cambia, ajustando el estado DURANTE el
 * render (patron oficial de React) en vez de con un efecto: evita el
 * re-render en cascada. Usado por los modales que reciben un payload nuevo
 * mientras siguen montados.
 */
export function useResetAlCambiar<T>(valor: T, reset: () => void) {
  const [anterior, setAnterior] = useState(valor);
  if (valor !== anterior) {
    setAnterior(valor);
    reset();
  }
}
