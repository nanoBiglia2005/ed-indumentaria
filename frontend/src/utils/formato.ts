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
