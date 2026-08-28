import { useEffect } from 'react';
import type { RefObject } from 'react';

/**
 * Ejecuta `onFuera` ante un mousedown fuera del elemento referenciado.
 * Solo escucha mientras `activo` sea true (tipicamente, dropdown abierto).
 */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  activo: boolean,
  onFuera: () => void
) {
  useEffect(() => {
    if (!activo) return;

    const handleClickFuera = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onFuera();
      }
    };
    document.addEventListener('mousedown', handleClickFuera);
    return () => document.removeEventListener('mousedown', handleClickFuera);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo]);
}
