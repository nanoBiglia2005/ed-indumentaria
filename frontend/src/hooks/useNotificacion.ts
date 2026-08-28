import { useCallback, useEffect, useRef, useState } from 'react';

/** Cuanto queda a la vista un aviso antes de desvanecerse. */
const MS_POR_DEFECTO = 2500;

/**
 * Aviso breve de "salio bien" que se borra solo (ver components/ui/Notificacion).
 *
 * Mostrar uno nuevo reinicia el reloj del anterior, asi dos acciones seguidas no
 * dejan el segundo aviso a medio camino. El timeout se limpia al desmontar.
 */
export function useNotificacion(ms: number = MS_POR_DEFECTO) {
  const [notificacion, setNotificacion] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelar = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  };

  const mostrar = useCallback(
    (mensaje: string) => {
      cancelar();
      setNotificacion(mensaje);
      timeoutRef.current = setTimeout(() => setNotificacion(null), ms);
    },
    [ms]
  );

  /** Lo saca ya (p. ej. al reabrir un modal, para no arrastrar el anterior). */
  const ocultar = useCallback(() => {
    cancelar();
    setNotificacion(null);
  }, []);

  useEffect(() => cancelar, []);

  return { notificacion, mostrar, ocultar };
}
