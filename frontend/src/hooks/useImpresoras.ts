import { useCallback, useEffect, useState } from 'react';
import { listarImpresoras } from '@/api/impresoras';
import { useResetAlCambiar } from './useResetAlCambiar';
import type { EstadoImpresoras, Impresora } from '@/types/impresoras';

/**
 * Registro de impresoras + cual esta seleccionada para imprimir.
 *
 * La seleccion arranca en `id_impresora_sugerida`, que el backend calcula con
 * el MISMO resolvedor que usa al imprimir: lo que se ve preseleccionado es
 * exactamente lo que va a pasar si el usuario no toca nada.
 *
 * `puedeElegir` es cosmetico: si es false, el backend ignora igual el id que se
 * mande. Sirve para no mostrarle un control inutil al empleado.
 */
export function useImpresoras() {
  const [impresoras, setImpresoras] = useState<Impresora[]>([]);
  const [sugerida, setSugerida] = useState<number | null>(null);
  const [puedeElegir, setPuedeElegir] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [seleccionada, setSeleccionada] = useState<number | null>(null);

  const aplicar = useCallback((estado: EstadoImpresoras | null) => {
    setImpresoras(estado?.impresoras ?? []);
    setSugerida(estado?.id_impresora_sugerida ?? null);
    setPuedeElegir(estado?.puede_elegir ?? false);
  }, []);

  const pedir = useCallback(
    (sigueVivo: () => boolean) =>
      listarImpresoras()
        .then((estado) => {
          if (sigueVivo()) aplicar(estado);
        })
        .catch((err) => {
          // Que no se pueda listar no puede impedir vender: se sigue sin
          // selector y el backend resuelve el destino por su cuenta.
          console.error('Error al obtener las impresoras:', err);
          if (sigueVivo()) aplicar(null);
        })
        .finally(() => {
          if (sigueVivo()) setCargando(false);
        }),
    [aplicar]
  );

  // La carga inicial NO pasa por `recargar`: ese hace setCargando(true) de
  // forma sincrona y eso, dentro de un efecto, encadena renders
  // (react-hooks/set-state-in-effect). Aca el estado arranca en `cargando` y
  // solo se toca desde los callbacks de la promesa.
  useEffect(() => {
    let vivo = true;
    pedir(() => vivo);
    return () => {
      vivo = false;
    };
  }, [pedir]);

  const recargar = useCallback(() => {
    setCargando(true);
    return pedir(() => true);
  }, [pedir]);

  // La sugerida llega despues del fetch: se adopta ajustando el estado durante
  // el render, no con un efecto (ver useResetAlCambiar). Una eleccion manual
  // posterior no se pisa, porque `sugerida` ya no cambia.
  useResetAlCambiar(sugerida, () => setSeleccionada(sugerida));

  return { impresoras, seleccionada, setSeleccionada, puedeElegir, cargando, recargar };
}
