import type { Impresora } from '@/types/impresoras';

/**
 * Orden en que se muestran las impresoras: la predeterminada primero (es la
 * que usa todo el mundo), despues las conectadas, y al final las desactivadas.
 * Dentro de cada grupo, por nombre.
 *
 * La idea es que lo primero de la lista sea siempre lo que conviene elegir, sin
 * que el usuario tenga que leer el estado de cada una.
 */
export const ordenarImpresoras = (impresoras: Impresora[]): Impresora[] =>
  [...impresoras].sort((a, b) => {
    if (a.activa !== b.activa) return a.activa ? -1 : 1;
    if (a.es_predeterminada !== b.es_predeterminada) return a.es_predeterminada ? -1 : 1;
    if (a.conectada !== b.conectada) return a.conectada ? -1 : 1;
    return a.nombre.localeCompare(b.nombre);
  });

/**
 * Estado de una impresora en palabras. Lo lee alguien que no es tecnico, asi
 * que dice que pasa si se elige, no el detalle del websocket.
 */
export const estadoImpresora = (impresora: Impresora) => {
  if (!impresora.activa) return 'Desactivada';
  if (!impresora.conectada) return 'Sin conexión';
  return 'En línea';
};

/**
 * Color del punto de estado, con los tokens del sistema: `neutro` para lo
 * apagado y `acento` para el aviso de "sin conexion" (es exactamente el caso de
 * uso de acento). El verde queda literal a proposito: es semantica de
 * resultado, no identidad de marca.
 */
export const colorEstadoImpresora = (impresora: Impresora) => {
  if (!impresora.activa) return 'bg-neutro-400';
  if (!impresora.conectada) return 'bg-acento-500';
  return 'bg-green-500';
};
