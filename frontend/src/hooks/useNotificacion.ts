import { useCallback, useEffect, useRef, useState } from 'react';

/** Cuanto queda a la vista un aviso antes de desvanecerse. */
const MS_POR_DEFECTO = 2500;

export type TipoNotificacion = 'exito' | 'error';

/**
 * Aviso breve que se borra solo (ver components/ui/Notificacion). Por defecto es
 * el de "salio bien" (verde, tilde); `mostrar(mensaje, 'error')` es el aviso de
 * "esto no se pudo" (rojo, cruz) — mismo mecanismo, se usa donde una accion
 * queda bloqueada (p. ej. agregar un articulo sin stock).
 *
 * Mostrar uno nuevo reinicia el reloj del anterior, asi dos acciones seguidas no
 * dejan el segundo aviso a medio camino. El timeout se limpia al desmontar.
 */
export function useNotificacion(ms: number = MS_POR_DEFECTO) {
  const [estado, setEstado] = useState<{ mensaje: string; tipo: TipoNotificacion } | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelar = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  };

  const mostrar = useCallback(
    (mensaje: string, tipo: TipoNotificacion = 'exito') => {
      cancelar();
      setEstado({ mensaje, tipo });
      timeoutRef.current = setTimeout(() => setEstado(null), ms);
    },
    [ms]
  );

  /** Lo saca ya (p. ej. al reabrir un modal, para no arrastrar el anterior). */
  const ocultar = useCallback(() => {
    cancelar();
    setEstado(null);
  }, []);

  useEffect(() => cancelar, []);

  return {
    notificacion: estado?.mensaje ?? null,
    tipoNotificacion: estado?.tipo ?? 'exito',
    mostrar,
    ocultar,
  };
}
