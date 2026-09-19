import { useEffect, useState } from 'react';

// Mismo corte que usa Layout para pasar de flex-col (celular) a flex-row
// (escritorio): min-width 768px es el breakpoint "md" de Tailwind.
const CONSULTA_MD = '(min-width: 768px)';

/** true por debajo del breakpoint "md" (768px) de Tailwind. */
export function useEsPantallaChica(): boolean {
  const [esChica, setEsChica] = useState(() => !window.matchMedia(CONSULTA_MD).matches);

  useEffect(() => {
    const mql = window.matchMedia(CONSULTA_MD);
    const handler = () => setEsChica(!mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return esChica;
}
