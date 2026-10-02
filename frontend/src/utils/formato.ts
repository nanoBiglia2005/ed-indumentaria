import type { CSSProperties } from 'react';

/**
 * Las fechas de REMITOS son columnas @db.Date, o sea medianoche UTC. Hay que
 * leerlas en UTC: con la hora local de Argentina (UTC-3) caerian el dia anterior.
 */
export function formatearFecha(fecha: Date | string | null): string {
  if (!fecha) return 'Sin fecha';
  const valor = new Date(fecha);
  const dia = String(valor.getUTCDate()).padStart(2, '0');
  const mes = String(valor.getUTCMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${valor.getUTCFullYear()}`;
}

const FORMATO_FECHA_HORA = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Buenos_Aires',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/**
 * Fecha y hora de un INSTANTE (timestamptz, p. ej. REPORTES.fecha_generado), no
 * de un @db.Date: se muestra en hora argentina sin importar la zona de la PC.
 */
export function formatearFechaHora(fecha: Date | string): string {
  return FORMATO_FECHA_HORA.format(new Date(fecha)).replace(',', '');
}

/**
 * Sacude un input para marcar entrada invalida (keyframes `shake` de index.css).
 * El truco de leer offsetWidth reinicia la animacion si ya estaba corriendo.
 */
export function triggerShake(el: HTMLElement | null) {
  if (!el) return;
  el.classList.remove('animate-shake');
  void el.offsetWidth;
  el.classList.add('animate-shake');
}

/** Estilo inline para recortar texto a N lineas (line-clamp via -webkit-box). */
export function estiloLineClamp(lineas: number): CSSProperties {
  return {
    display: '-webkit-box',
    WebkitLineClamp: lineas,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  };
}

/** Importe como se lee en el mostrador: $128.830. */
export const formatearPesos = (valor: number) => `$${Math.round(valor).toLocaleString('es-AR')}`;

